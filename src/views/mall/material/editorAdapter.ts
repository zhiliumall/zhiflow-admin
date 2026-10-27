import { addObj as addMaterialObj } from '@/api/mall/material'

export interface EditorUploadData {
  /** 落到素材库的哪个分组；不传则不写素材库 */
  groupId?: string
  materialType?: string
}

/**
 * 编辑器上传成功后的默认副作用：把图片写入商城素材库。
 *
 * 从编辑器里剥离出来，让通用编辑器不依赖「素材库」概念；调用方未显式注入 onUploaded
 * 且 autoSaveToMaterial 为真时走此默认适配器。素材必须挂在某个分组下才能在素材库里看到，
 * 所以没给 groupId 时只插入编辑器、不落素材库。
 */
export function defaultMaterialSaver(file: File, url: string, uploadData?: EditorUploadData) {
  const groupId = uploadData?.groupId
  if (!groupId || !url) return
  return addMaterialObj({
    type: uploadData?.materialType || '1',
    groupId,
    name: file?.name || 'image',
    url,
    // 素材所属类型：0 = 商城素材（单店铺只有这一种）
    ofType: '0',
  }).catch(() => {})
}
