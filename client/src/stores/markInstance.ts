import { defineStore } from 'pinia'
import { ref } from 'vue'

export type MarkEncodingChannel = 'color' | 'size' | 'width' | 'height'

export interface MarkEncoding {
  color?: string
  size?: string
  width?: string
  height?: string
  // 仅针对 Color 通道：当前颜色映射模式（数值渐变 / 分类型）
  colorMode?: 'numeric' | 'categorical'
}

// 数值型颜色映射用的颜色停靠点
export interface ColorStop {
  position: number // 0 ~ 1 的相对位置
  color: string // 十六进制颜色
  opacity: number // 0 ~ 1 的不透明度
}

export interface MarkChildInstance {
  id: string
  name: string
  // 当前子实例选中的分组值（仅 group 父实例下有效）
  selectedValue: string | null
  // 这个子实例对应的实体数量
  entities: number
  // 这个子实例包含的实体在 tableData 中的行索引
  entityIndices: number[]
  // 子实例对应的 marker 可视化
  markerThumbnail?: string | null
  markerJsonData?: any | null
  // 子实例自身的编码
  encoding?: MarkEncoding
  // 数值型颜色映射的停靠点配置
  colorStops?: ColorStop[]
  // 分类型颜色映射：类别值 -> 颜色
  categoricalColors?: Record<string, string>
}

export interface MarkInstance {
  id: string
  name: string
  // 父实例整体覆盖的实体数量（对于 group，为所有子实例实体之和）
  entities: number
  fieldType: 'numeric' | 'categorical' | null
  fieldName: string | null
  // 是否为 group 父实例（有子实例）
  isGroup: boolean
  // 非 group 时：父实例整体覆盖的实体行索引；group 时：置为 null
  entityIndices: number[] | null
  // group 类型下的子实例列表；普通 mark 为空数组
  children: MarkChildInstance[]
  // 当前 mark 对应的 marker 可视化（可选）
  markerThumbnail?: string | null
  markerJsonData?: any | null
  // 数值型颜色映射的停靠点配置
  colorStops?: ColorStop[]
  // 分类型颜色映射：类别值 -> 颜色
  categoricalColors?: Record<string, string>
  // 当前 mark 的可视编码设置（Color / Size / Width / Height）
  encoding?: MarkEncoding
  // group 专用：拖拽放置到画布时是否打乱位置顺序
  shuffleOnDrop?: boolean
}

/** 当前在左侧栏弹出的「Mark 详情面板」对应的选中项：单实例 或 group 的子实例 */
export type SelectedMarkForDetail =
  | { type: 'singleInstance'; markId: string }
  | { type: 'childInstance'; parentMarkId: string; childId: string }
  | null

export const useMarkInstanceStore = defineStore('markInstance', () => {
  const markInstances = ref<MarkInstance[]>([])
  /** 非 null 时左侧栏显示 MarkDetailPanel，否则显示 LeftSidebar */
  const selectedMarkForDetail = ref<SelectedMarkForDetail>(null)
  /** 有选中 Mark 时，为 true 表示仅收起详情面板（不取消选中），由 editor 与工具栏共用 */
  const markDetailPanelCollapsed = ref(false)

  function setMarkDetailPanelCollapsed(collapsed: boolean) {
    markDetailPanelCollapsed.value = collapsed
  }

  function setSelectedMarkForDetail(payload: SelectedMarkForDetail) {
    selectedMarkForDetail.value = payload
    if (payload) {
      markDetailPanelCollapsed.value = false
    }
  }

  function clearSelectedMarkForDetail() {
    selectedMarkForDetail.value = null
    markDetailPanelCollapsed.value = false
  }

  function addMarkInstance(mark: Omit<MarkInstance, 'id'>) {
    const id = `mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    markInstances.value.push({
      id,
      ...mark,
      markerThumbnail: mark.markerThumbnail ?? null,
      markerJsonData: mark.markerJsonData ?? null,
      encoding: mark.encoding ?? {},
      colorStops: mark.colorStops,
      categoricalColors: mark.categoricalColors,
    })
  }

  function removeMarkInstance(id: string) {
    // 如果当前详情面板选中的就是这个实例（或它的子实例），一起清空选中状态
    const sel = selectedMarkForDetail.value
    if (sel) {
      const isSameSingle = sel.type === 'singleInstance' && sel.markId === id
      const isSameParent = sel.type === 'childInstance' && sel.parentMarkId === id
      if (isSameSingle || isSameParent) {
        selectedMarkForDetail.value = null
        markDetailPanelCollapsed.value = false
      }
    }

    markInstances.value = markInstances.value.filter(item => item.id !== id)
  }

  function clearAllMarkInstances() {
    markInstances.value = []
  }

  function updateMarkInstance(id: string, payload: Partial<Omit<MarkInstance, 'id'>>) {
    const target = markInstances.value.find(item => item.id === id)
    if (!target) return
    Object.assign(target, payload)
  }

  function updateChildInstance(
    parentId: string,
    childId: string,
    payload: Partial<Omit<MarkChildInstance, 'id'>>
  ) {
    const parent = markInstances.value.find(item => item.id === parentId)
    if (!parent || !parent.children) return
    const child = parent.children.find(c => c.id === childId)
    if (!child) return
    Object.assign(child, payload)

    // 设置 child 的 encoding 时，兄弟子实例的 encoding 同步为相同（以及同时传入的 colorStops / categoricalColors）
    for (const c of parent.children) {
      if (c.id === childId) continue
      if (payload.encoding !== undefined) c.encoding = payload.encoding
      if (payload.colorStops !== undefined) c.colorStops = payload.colorStops
      if (payload.categoricalColors !== undefined) c.categoricalColors = payload.categoricalColors
    }
  }

  return {
    markInstances,
    selectedMarkForDetail,
    markDetailPanelCollapsed,
    setMarkDetailPanelCollapsed,
    setSelectedMarkForDetail,
    clearSelectedMarkForDetail,
    addMarkInstance,
    removeMarkInstance,
    clearAllMarkInstances,
    updateMarkInstance,
    updateChildInstance,
  }
})

