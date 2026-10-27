import type { ElMessage } from 'element-plus'
import type { LoadingOptions } from 'element-plus/es/components/loading/src/types'

// 新增：定义 ElMessageBox 的类型引用，用于声明 $confirm/$prompt 等全局属性的类型
// 说明：使用 typeof import 方式获取运行时导出的 ElMessageBox 的类型，避免直接值导入造成编译问题
type ElMessageBoxType = typeof import('element-plus')['ElMessageBox']
// 新增：定义 ElNotification 的类型引用
type ElNotificationType = typeof import('element-plus')['ElNotification']

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $message: typeof ElMessage
    $loading: (options?: LoadingOptions) => {
      close: () => void
    }
    $t: (key: string, options?: Record<string, any>) => string
    // $notify 的类型声明，修复 TS2339
    $notify: ElNotificationType
    // 统一为 Element Plus 的 MessageBox 全局属性补充类型，修复 TS2339（属性不存在）告警
    $msgbox: ElMessageBoxType
    $alert: ElMessageBoxType['alert']
    $confirm: ElMessageBoxType['confirm']
    $prompt: ElMessageBoxType['prompt']
  }
}
