import type { IButtonMenu, IDomEditor } from '@wangeditor/editor'
import mitt from 'mitt'

/**
 * 素材库菜单事件总线。菜单只负责发事件，素材弹窗由 BaseEditor 在自身组件树内
 * 托管（受控 el-dialog），因此不再命令式 render 挂载 DOM，也不再依赖
 * window.__APP__._context 这类 Vue 私有 API。事件带上 editor 实例，供多编辑器
 * 场景下各 BaseEditor 只响应属于自己的那个。
 */
export const editorBus = mitt<{ 'material-select': { editor: IDomEditor } }>()

/**
 * 素材库选择菜单：退化为纯事件触发器。点击时通过事件总线通知对应的 BaseEditor
 * 打开素材弹窗。
 */
class MaterialSelectMenu implements IButtonMenu {
  title = '素材库选择'
  tag = 'button'

  getValue(_editor: IDomEditor): string | boolean {
    return ''
  }

  isActive(_editor: IDomEditor): boolean {
    return false
  }

  isDisabled(_editor: IDomEditor): boolean {
    return false
  }

  exec(editor: IDomEditor, _value: string | boolean) {
    editorBus.emit('material-select', { editor })
  }
}

export default MaterialSelectMenu
