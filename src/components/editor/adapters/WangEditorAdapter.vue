<!--
  Copyright (C) 2024-2025 gaipharma.com
  SPDX-License-Identifier: AGPL-3.0-only
-->
<!--
  WangEditor adapter —— 富文本编辑器实现，由 BaseEditor(dispatcher) 动态加载。

  本文件只负责可编辑态，要点：
    1. 没有 disabled 只读分支 —— 只读态由 dispatcher 统一走 v-html + sanitizeRichText，
       不加载任何编辑器内核（只读消费方因此零体积、零解析风险）。
    2. 图片上传上限、正文字号从 editorDefaults 读，让「文本编辑器配置」页
       展示的是真实值而非写死的值。
    3. wangEditor 的 CSS 与 Boot 注册随本文件动态加载 —— 不用 wangEditor 的页面
       不会把这份 CSS 打进 chunk。

  ⚠ 已知问题：
     scroll 绑定用 document.querySelector('.wangeditor-editor .w-e-scroll')，
     是全局查询，同页多实例时会串。
-->
<template>
  <div ref="hostRef" class="rich-wangeditor" :style="{ '--rich-editor-font-size': fontSizePx }">
    <div style="min-height: 400px;">
      <Toolbar style="border-bottom: 1px solid #ccc" :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" />
      <Editor style="height: calc(100vh - 390px); min-height: 400px; overflow-y: hidden;" class="wangeditor-editor"
        v-model="content" :defaultConfig="editorConfig" :mode="mode" @onCreated="handleCreated"
        @onChange="handleChange" />
    </div>
    <el-backtop v-if="showBackTop" style="z-index: 2000; background: none; box-shadow: none;" :right="17" :bottom="140"
      :visibility-height="200" target=".wangeditor-editor .w-e-scroll">
      <el-button circle class="action-btn action-up" title="回到顶部">
        <el-icon>
          <Top />
        </el-icon>
      </el-button>
    </el-backtop>
    <div v-if="showBottomAction" class="floating-actions">
      <el-button circle class="action-btn action-down" @click="scrollToBottom" title="回到底部">
        <el-icon>
          <Bottom />
        </el-icon>
      </el-button>
    </div>
    <el-dialog v-model="materialVisible" append-to-body top="5px" width="80%" title="素材库选择"
      :destroy-on-close="true">
      <MaterialPage v-if="materialVisible" v-model:value="materialUrls" :checkMaterial="true"
        selectType="1" :num="20" />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="materialVisible = false">取消</el-button>
          <el-button type="primary" @click="onMaterialConfirm">插入</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { useLiftAboveHost } from '@/components/material/lift-z'
import { uploadImageFile } from '@/components/material/upload-api'
import { getToken } from '@/utils/auth'
import { message } from '@/utils/message'
import { sanitizeRichTextForEdit } from '@/utils/sanitizeHtml'
import { extractUploadUrl } from '@/utils/upload'
import { apiUrl } from '@/utils/http/apiUrl'
import { defaultMaterialSaver } from '@/views/mall/material/editorAdapter'
import MaterialPage from '@/views/mall/material/index.vue'
import { Bottom, Top } from '@element-plus/icons-vue'
import { Boot } from '@wangeditor/editor'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import MaterialSelectMenu, { editorBus } from '../MaterialSelectMenu'
import { EDITOR_DEFAULTS } from '../editorDefaults'

const materialSelectMenuConf = {
  key: 'materialSelect',
  factory() {
    return new MaterialSelectMenu()
  },
}

/**
 * 「同一张图第二次插入」的复用缓存：文件指纹 → 该图已经在线上的地址。
 *
 * 为什么必须自己做：wangEditor 的图片上传走 uppy，而它的 uppy 实例按 editor 缓存、
 * 上传完从不 removeFile；uppy 的 file id 又只由 name+type+size 拼成（wangEditor 调
 * addFile 时压根没传 lastModified）。于是同名同大小的图第二次插入必抛
 * `Cannot add the duplicate file '...', it already exists`，而且是 uncaught promise
 * rejection —— 用户端零提示，图就是插不进去。配置层面无解：wangEditor 暴露的
 * onBeforeUpload 是 uppy 的钩子，在 addFile **之后**才跑，拦不住。
 *
 * 现在改走 customUpload 自己发请求（见下方 uploadImage.customUpload），uppy 整个退出
 * 链路，重复报错随之消失；同时把第一次拿到的线上地址记下来，第二次直接拿这张线上图插入，
 * 连请求都不用发。
 *
 * 模块级 = 跨编辑器实例、跨页面共享（刷新即失效，够用）。只存字符串，仍设上限，
 * 防止长会话里无限增长。
 */
const uploadedByFingerprint = new Map<string, string>()
const FINGERPRINT_CACHE_MAX = 200

function rememberUploaded(fingerprint: string, url: string) {
  if (uploadedByFingerprint.size >= FINGERPRINT_CACHE_MAX) {
    // Map 的迭代序就是插入序，删最早那条即可（简易 FIFO，不值得为它引一套 LRU）
    const oldest = uploadedByFingerprint.keys().next().value
    if (oldest !== undefined) uploadedByFingerprint.delete(oldest)
  }
  uploadedByFingerprint.set(fingerprint, url)
}

/**
 * 文件指纹。优先内容级 SHA-256：同一张图不管文件名叫什么都命中，两张不同的图绝不误判
 * （uppy 那套 name+size 的口径就会误判）。
 *
 * crypto.subtle 只在 secure context（https / localhost）可用，开发机用 http://内网IP
 * 打开时降级到 name|type|size|lastModified —— 降级只会**漏命中**（多传一次，仍然成功），
 * 不会错命中插错图，方向是安全的。
 */
async function fingerprintFile(file: File): Promise<string> {
  try {
    if (globalThis.crypto?.subtle && typeof file.arrayBuffer === 'function') {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
      return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    // 读文件/算摘要失败一律降级，不因为指纹算不出来就阻断上传
  }
  return `${file.name}|${file.type}|${file.size}|${file.lastModified}`
}

function registerMaterialMenu() {
  try {
    Boot.registerMenu(materialSelectMenuConf)
  } catch {
    // 重复注册（多次 mount / HMR）时 wangEditor 会抛错，幂等吞掉即可，
    // 不再依赖模块级布尔标志（HMR 下会失真）
  }
}

export default {
  name: 'WangEditorAdapter',
  components: { Editor, Toolbar, Top, Bottom, MaterialPage },
  props: {
    uploadData: { type: Object },
    value: { type: String },
    maxSize: { type: Number, default: EDITOR_DEFAULTS.imageMaxKb },
    /** BaseEditor 透传的旧参数，单店铺下不再使用 */
    shopId: { type: String },
    clientType: { type: String, default: '' },
    showBackTop: { type: Boolean, default: false },
    showBottomAction: { type: Boolean, default: false },
    onUploaded: { type: Function },
    autoSaveToMaterial: { type: Boolean, default: true },
  },
  emits: ['update:value', 'editorScroll'],
  setup(props, context) {
    registerMaterialMenu()

    /** 字号经 CSS 变量下发，使 editorDefaults 成为真正的唯一常量源 */
    const fontSizePx = `${EDITOR_DEFAULTS.bodyFontSizePx}px`

    const editorRef = shallowRef<any>(null)
    const content = ref<string>(props.value || '')
    const scrollEl = ref<HTMLElement | null>(null)

    // 素材库弹窗：受控组件常驻组件树内，菜单通过事件总线触发
    const materialVisible = ref(false)
    const materialUrls = ref<string[]>([])
    // 编辑器常被放进自绘 fixed 遮罩弹窗（如公告），打开「图」素材库前把 EP 层级推到宿主遮罩之上
    const hostRef = ref<HTMLElement | null>(null)
    const { liftAbove } = useLiftAboveHost()

    const onOpenMaterial = ({ editor }: { editor: any }) => {
      // 多实例隔离：只响应属于自己的编辑器实例
      if (editor !== editorRef.value) return
      materialUrls.value = []
      liftAbove(hostRef.value)
      materialVisible.value = true
    }

    const onMaterialConfirm = () => {
      const editor = editorRef.value
      if (editor) {
        materialUrls.value.forEach((url: string) => {
          if (url) {
            editor.focus()
            // 编辑出口净化：写进编辑器的内容用 ForEdit（保留 iframe，避免回写丢失）
            editor.dangerouslyInsertHtml(
              sanitizeRichTextForEdit(`<img src="${encodeURI(url)}" alt="" />`),
            )
          }
        })
      }
      materialVisible.value = false
    }

    // 双向绑定：父传入的 value 变化后同步到编辑器
    watch(
      () => props.value,
      val => {
        content.value = val || ''
      }
    )

    const toolbarConfig = reactive<Record<string, any>>({})
    const editorConfig = reactive<Record<string, any>>({
      placeholder: '请输入内容...',
      MENU_CONF: {
        uploadImage: {
          /**
           * 自己接管上传，wangEditor 内置的 uppy 链路整个不参与。换掉它是为了根治两条线上报错：
           *
           *  1. `Cannot add the duplicate file '...'` —— uppy 实例按 editor 缓存且上传完从不
           *     清理，file id 只由 name+type+size 拼成，同一张图第二次插入必炸（详见文件顶部
           *     uploadedByFingerprint 的注释）。现在第二次直接复用第一次的线上地址，不再重传。
           *  2. `Upload stalled for 10 seconds, aborting.` —— uppy 的 timeout 语义是「N 秒内
           *     没有 progress 事件就 abort」，而请求体发完之后等后端转存文件的这一段
           *     本来就没有 progress 事件可发；图片档默认只有 10s，稍慢就被前端自己掐断，文件
           *     其实已经传上去了。换成整体超时（EDITOR_DEFAULTS.imageUploadTimeoutMs）才是对的口径。
           *
           * ⚠ customUpload 一旦启用，同级的 server / fieldName / headers / meta / maxFileSize /
           *   onSuccess / customInsert **全部不再被 wangEditor 调用**，故不留在这里当死配置，
           *   职责都搬进了下面：上传地址与 dir/fileType 见 uploadImageFile（同一条素材上传链路，
           *   token 由 http 拦截器统一带），体积与类型校验见开头两道 return，
           *   落素材库见末尾。allowedFileTypes 未覆写、仍取默认 image/*，它还在给文件选择框的
           *   accept 用，不是死配置。
           */
          async customUpload(
            file: File,
            insertFn: (url: string, alt?: string, href?: string) => void,
          ) {
            // 前置校验：image/* + maxFileSize。
            // 体积上限优先 prop、其次唯一常量源 —— 让 maxSize prop 与「文本编辑器配置」页
            // 展示的 5MB 都是真值。
            // 刻意不接 components/material/upload-guard：那份白名单（png/jpg/webp/gif/bmp/svg）
            // 比 image/* 严，接进来会收紧编辑器能贴的格式。
            const maxKb = props.maxSize ?? EDITOR_DEFAULTS.imageMaxKb
            if (!/^image\//i.test(file.type || '')) {
              message('只能插入图片文件', { type: 'error' })
              return
            }
            if (file.size > maxKb * 1024) {
              message(`图片超过 ${Math.round(maxKb / 1000)}MB 上限，请压缩后再插入`, {
                type: 'error',
              })
              return
            }

            const editor = editorRef.value
            const fingerprint = await fingerprintFile(file)
            const cached = uploadedByFingerprint.get(fingerprint)
            if (cached) {
              // 同一张图第二次插入：直接用线上这张，不再发请求。
              // 也不再走 onUploaded / defaultMaterialSaver —— 第一次已经落过素材库，
              // 再落一次就是同一张图两条记录。
              insertFn(cached)
              return
            }

            try {
              const url = await uploadImageFile(file, {
                // 与原 meta.dir/fileType 一致（后端最终落 material/ 目录，
                // fileType=image 才会加水印）
                dir: 'material/',
                timeoutMs: EDITOR_DEFAULTS.imageUploadTimeoutMs,
                onProgress: pct => editor?.showProgressBar?.(pct),
              })
              rememberUploaded(fingerprint, url)
              insertFn(url)
              if (props.onUploaded) {
                await (props.onUploaded as (f: File, u: string) => void | Promise<void>)(file, url)
              } else if (props.autoSaveToMaterial) {
                await defaultMaterialSaver(file, url, props.uploadData as any)
              }
            } catch (e) {
              // 失败提示由 http 拦截器统一弹（业务错误 / 超时 / 网络错误都覆盖到了），
              // 这里兜住 rejection —— 旧实现里这条链路失败就是一条 uncaught promise
              // rejection（控制台红字、页面完全无感）。唯一拦截器不会弹的是「请求成功
              // 但响应里没有 link」，单独补一条，别静默吞掉。
              if (e instanceof Error && /no url/i.test(e.message)) {
                message('图片已上传，但没拿到访问地址，请重试', { type: 'error' })
              }
              console.error('[WangEditorAdapter] 图片上传失败', e)
            } finally {
              // 进度条只在 >=100 时才自我隐藏（wangEditor changeProgress 的实现），
              // 而 uploadImageFile 的进度刻意封顶 99 留给服务端响应 —— 这里不补这一下，
              // 无论成败进度条都会永久停在 99%。
              editor?.showProgressBar?.(100)
            }
          },
        },
        // 视频上传。工具栏 group-video 一直挂着 uploadVideo，但 MENU_CONF 从没配过它 ——
        // wangEditor 取不到 server 就抛「Cannot get upload server address / 没有配置上传地址」，
        // 于是按钮在、功能死（insertVideo 外链不受影响，因为它根本不走上传）。
        // 后端 /upms/file/upload 不区分文件类型（只有 image 才加水印），fileType=video
        // 与素材库「视频」页签同一条路径，传上去的视频在素材库能看到。
        uploadVideo: {
          // 不经 axios，要自己拼后端前缀（VITE_API_BASE）
          server: apiUrl('/upms/file/upload'),
          fieldName: 'file',
          maxFileSize: EDITOR_DEFAULTS.videoMaxKb * 1024,
          // 视频比图片大一到两个量级，wangEditor 默认 30s 超时对几十 MB 的文件必然假失败
          timeout: 10 * 60 * 1000,
          headers: {
            Authorization: 'Bearer ' + (getToken()?.access_token || ''),
          },
          meta: { dir: 'material/', fileType: 'video' },
          // 刻意不接 defaultMaterialSaver：素材库落库走的是图片语义（尺寸/缩略图），
          // 视频塞进去会得到一条渲染不出的图片记录。要进素材库请走素材管理页上传。
          customInsert(res: any, insertVideoFn: (url: string, poster?: string) => void) {
            const url = extractUploadUrl(res)
            if (url) insertVideoFn(url, '')
          },
        },
      },
    })

    const mode = 'default'

    const scrollToBottom = () => {
      const el = document.querySelector('.wangeditor-editor .w-e-scroll') as HTMLElement | null
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      }
    }

    const onEditorScroll = () => {
      const el = scrollEl.value
      if (!el) return
      const total = el.scrollHeight - el.clientHeight
      const top = el.scrollTop
      const ratio = total > 0 ? top / total : 0
      context.emit('editorScroll', { top, ratio })
    }

    const bindScroll = () => {
      const el = document.querySelector('.wangeditor-editor .w-e-scroll') as HTMLElement | null
      if (el && el !== scrollEl.value) {
        if (scrollEl.value) scrollEl.value.removeEventListener('scroll', onEditorScroll as any)
        scrollEl.value = el
        el.addEventListener('scroll', onEditorScroll as any, { passive: true } as any)
      }
    }

    const handleCreated = (editor: any) => {
      editorRef.value = editor
      bindScroll()
      toolbarConfig.toolbarKeys = [
        'headerSelect',
        'blockquote',
        '|',
        'bold',
        'underline',
        'italic',
        {
          key: 'group-more-style',
          title: '更多',
          iconSvg:
            '<svg viewBox="0 0 1024 1024"><path d="M204.8 505.6m-76.8 0a76.8 76.8 0 1 0 153.6 0 76.8 76.8 0 1 0-153.6 0Z"></path><path d="M505.6 505.6m-76.8 0a76.8 76.8 0 1 0 153.6 0 76.8 76.8 0 1 0-153.6 0Z"></path><path d="M806.4 505.6m-76.8 0a76.8 76.8 0 1 0 153.6 0 76.8 76.8 0 1 0-153.6 0Z"></path></svg>',
          menuKeys: ['through', 'code', 'sup', 'sub', 'clearStyle'],
        },
        'color',
        'bgColor',
        '|',
        'fontSize',
        'fontFamily',
        'lineHeight',
        '|',
        'bulletedList',
        'numberedList',
        'todo',
        {
          key: 'group-justify',
          title: '对齐',
          iconSvg:
            '<svg viewBox="0 0 1024 1024"><path d="M768 793.6v102.4H51.2v-102.4h716.8z m204.8-230.4v102.4H51.2v-102.4h921.6z m-204.8-230.4v102.4H51.2v-102.4h716.8zM972.8 102.4v102.4H51.2V102.4h921.6z"></path></svg>',
          menuKeys: ['justifyLeft', 'justifyRight', 'justifyCenter', 'justifyJustify'],
        },
        {
          key: 'group-indent',
          title: '缩进',
          iconSvg:
            '<svg viewBox="0 0 1024 1024"><path d="M0 64h1024v128H0z m384 192h640v128H384z m0 192h640v128H384z m0 192h640v128H384zM0 832h1024v128H0z m0-128V320l256 192z"></path></svg>',
          menuKeys: ['indent', 'delIndent'],
        },
        '|',
        'emotion',
        'insertLink',
        {
          key: 'group-image',
          title: '图片',
          iconSvg:
            '<svg viewBox="0 0 1024 1024"><path d="M959.877 128l0.123 0.123v767.775l-0.123 0.122H64.102l-0.122-0.122V128.123l0.122-0.123h895.775zM960 64H64C28.795 64 0 92.795 0 128v768c0 35.205 28.795 64 64 64h896c35.205 0 64-28.795 64-64V128c0-35.205-28.795-64-64-64zM832 288.01c0 53.023-42.988 96.01-96.01 96.01s-96.01-42.987-96.01-96.01S682.967 192 735.99 192 832 234.988 832 288.01zM896 832H128V704l224.01-384 256 320h64l224.01-192z"></path></svg>',
          menuKeys: ['materialSelect', 'uploadImage'],
        },
        {
          key: 'group-video',
          title: '视频',
          iconSvg:
            '<svg viewBox="0 0 1024 1024"><path d="M981.184 160.096C837.568 139.456 678.848 128 512 128S186.432 139.456 42.816 160.096C15.296 267.808 0 386.848 0 512s15.264 244.16 42.816 351.904C186.464 884.544 345.152 896 512 896s325.568-11.456 469.184-32.096C1008.704 756.192 1024 637.152 1024 512s-15.264-244.16-42.816-351.904zM384 704V320l320 192-320 192z"></path></svg>',
          menuKeys: ['insertVideo', 'uploadVideo'],
        },
        'insertTable',
        'codeBlock',
        'divider',
        '|',
        'undo',
        'redo',
        '|',
        'fullScreen',
      ]
    }

    const handleChange = () => {
      context.emit('update:value', content.value)
    }

    onMounted(() => editorBus.on('material-select', onOpenMaterial))

    onBeforeUnmount(() => {
      editorBus.off('material-select', onOpenMaterial)
      const editor = editorRef.value
      if (editor == null) return
      editor.destroy()
      if (scrollEl.value) scrollEl.value.removeEventListener('scroll', onEditorScroll as any)
    })

    return {
      hostRef,
      fontSizePx,
      editorRef,
      content,
      materialVisible,
      materialUrls,
      onMaterialConfirm,
      toolbarConfig,
      editorConfig,
      mode,
      handleCreated,
      handleChange,
      scrollToBottom,
      onEditorScroll,
      bindScroll,
    }
  },
}
</script>
<style lang="scss">
/* 正文字号经 CSS 变量中转，真正引用 editorDefaults.bodyFontSizePx。
   直接写 14px 的话，改常量不会生效，「文本编辑器配置」页展示的就是假值。 */
.rich-wangeditor .wangeditor-editor .w-e-text-container {
  font-size: var(--rich-editor-font-size, 14px);
}
</style>
