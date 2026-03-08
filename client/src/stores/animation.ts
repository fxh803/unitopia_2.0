// src/stores/counterStore.js
import { defineStore, storeToRefs } from 'pinia'
import paper from "paper";
import { useContainerAnimationStore } from '~/stores/containerAnimation'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { getRenderTxtData } from '~/composables/server'
import { useHoverInfoPanelStore } from '~/stores/hoverInfoPanel'
import { ref, computed, watch } from 'vue';

/** 后端返回的进度项（fetchProgressApi / processDataApi 的 progress 字段） */
export interface ProgressItem {
  process_id?: string
  type?: number
  totalSteps?: number
  steps?: number
  now_collage?: number
  total_collage?: number
  now_overview_idx?: number
  collage_result_type?: string[]
}

/** 后端返回的拼贴结果项（fetchProgressApi 的 result 字段，用于渲染 marker 等） */
export interface ResultItem {
  angle: number[]
  attributes: (string | null)[]
  data: number[]
  pos: [number, number][]
  size: [number, number][]
}

/** 带自定义属性的 Raster（paper.js 扩展） */
interface RasterWithProps extends paper.Raster {
  imgLoaded?: boolean
  dataLoaded?: boolean
  startPos?: paper.Point
  endPos?: paper.Point
  startRotate?: number
  endRotate?: number
  startScaleX?: number
  endScaleX?: number
  startScaleY?: number
  endScaleY?: number
  elapsedTime?: number
  startOpacity?: number
  endOpacity?: number
}

export const useAnimationStore = defineStore('animation', () => {
  // 状态
  const collaging = ref(false)
  const progress_data = ref<ProgressItem[]>([])
  const collage_result_type = ref<string[]>([])
  const canvas_width = ref(0)
  const canvas_height = ref(0)
  const posArray = ref<number[][]>([])
  const widthArray = ref<number[]>([])
  const heightArray = ref<number[]>([])
  const txtArray = ref<string[]>([])
  const angleArray = ref<number[]>([])
  const elements = ref<RasterWithProps[]>([])
  const result_data = ref<ResultItem[]>([])
  const dataBindingArray = ref<string[]>([])
  const now_collage_idx = ref(0)
  const now_start_idx = ref(0)
  const markerAni = ref<((event: paper.Event) => void) | null>(null)
  const containerAni = ref<((event: paper.Event) => void) | null>(null)
  const replayIdx = ref(0)
  const process_id = ref<string | null>(null)
  const replayTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const time_interval = ref(2000)
  const replaying = ref(false)
  const totalOverview = ref(0)
  const now_overview_idx = ref(0)
  const isUpdatingAnimation = ref(false) // 锁标志，防止并发执行

  // 计算属性
  const progress = computed(() => {
    if (replaying.value) {
      return progress_data.value[replayIdx.value]
    }
    else {
      return progress_data.value[progress_data.value.length - 1]
    }
  })

  // 监听collaging状态变化
  watch(collaging, (newValue) => {
    if (!newValue) {
        removeAnimation()
    }
  })

  // 方法

  function resetData() {
    collaging.value = false
    progress_data.value = []
    collage_result_type.value = []
    canvas_width.value = 0
    canvas_height.value = 0
    txtArray.value = []
    posArray.value = []
    widthArray.value = []
    heightArray.value = []
    angleArray.value = []
    elements.value = []
    result_data.value = []
    dataBindingArray.value = []
    now_collage_idx.value = 0
    now_start_idx.value = 0
    markerAni.value = null
    replayIdx.value = 0
    process_id.value = null
    replayTimer.value = null
    replaying.value = false
    now_overview_idx.value = 0
    totalOverview.value = 0
    time_interval.value = 2000
  }

  function stopReplay() {
    if (replayTimer.value != null) {
      clearInterval(replayTimer.value)
    }
    removeAnimation()
    replaying.value = false
  }

  function backToEdit() {
    resetData()
  }

  function resetReplayData() {
    replayIdx.value = 0
    // txtArray.value = []
    posArray.value = []
    widthArray.value = []
    heightArray.value = []
    angleArray.value = []
    now_collage_idx.value = 0
    now_start_idx.value = 0
    now_overview_idx.value = 0
    time_interval.value = 2000
  }

  function removeAnimation() {
    if (markerAni.value) {
      paper.view.off('frame', markerAni.value);
      markerAni.value = null
    }
    if (containerAni.value) {
      paper.view.off('frame', containerAni.value);
      containerAni.value = null
    }
    // 清理 container 的 shining paths
    const containerAnimationStore = useContainerAnimationStore()
    containerAnimationStore.clearShiningPaths()
  }

  function removeElements() {
    elements.value.forEach(element => {
      element.remove()
    })
    elements.value = []
  }

  function setData(now_collage: number, startIndex: number) {//对最新的数据进行整理
    const result = result_data.value[result_data.value.length - 1]
    if (result == null) return
    const dataBinding = getDataBinding(now_overview_idx.value, now_collage)
    // 获取当前幻灯片的 render_size
    const collageSeriesStore = useCollageSeriesStore()
    const { overviews, currentOverviewIndex } = storeToRefs(collageSeriesStore)
    const renderSize = overviews.value[currentOverviewIndex.value]?.collageSeries[now_collage]?.render_size ?? 1000

    for (let i = startIndex; i < result['pos'].length + startIndex; i++) {
      posArray.value[i] = [result['pos'][i - startIndex][0] * canvas_width.value, result['pos'][i - startIndex][1] * canvas_height.value];
      angleArray.value[i] = result['angle'][i - startIndex];
      dataBindingArray.value[i] = dataBinding?.[i - startIndex]??null;
      let originSize = 0
      if (collage_result_type.value[now_collage] === 'svg') {
        originSize = 100
      }
      else {
        originSize = 500
      }
      widthArray.value[i] = result['size'][i - startIndex][0] * originSize * (canvas_width.value / renderSize);
      heightArray.value[i] = result['size'][i - startIndex][1] * originSize * (canvas_width.value / renderSize);
    }
  }

  function setReplayData(idx: number, now_collage: number, startIndex: number) {
    const result = result_data.value[idx]
    if (result == null) return
    const dataBinding = getDataBinding(now_overview_idx.value, now_collage)
    // 获取当前幻灯片的 render_size
    const collageSeriesStore = useCollageSeriesStore()
    const { overviews, currentOverviewIndex } = storeToRefs(collageSeriesStore)
    const renderSize = overviews.value[currentOverviewIndex.value]?.collageSeries[now_collage]?.render_size ?? 1000

    for (let i = startIndex; i < result['pos'].length + startIndex; i++) {
      posArray.value[i] = [result['pos'][i - startIndex][0] * canvas_width.value, result['pos'][i - startIndex][1] * canvas_height.value];
      angleArray.value[i] = result['angle'][i - startIndex];
      dataBindingArray.value[i] = dataBinding?.[i - startIndex]??null;
      let originSize = 0
      if (collage_result_type.value[now_collage] === 'svg') {
        originSize = 100
      }
      else {
        originSize = 500
      }
      widthArray.value[i] = result['size'][i - startIndex][0] * originSize * (canvas_width.value / renderSize);
      heightArray.value[i] = result['size'][i - startIndex][1] * originSize * (canvas_width.value / renderSize);
    }
  }
  // 根据 overview_idx 和 collage_idx 获取对应的 dataBinding，打平成一维数组
  function getDataBinding(overview_idx: number, collage_idx: number): Array<any> | null {
    const hoverInfoPanelStore = useHoverInfoPanelStore()
    const allData = hoverInfoPanelStore.allData
    const overview = allData[overview_idx]
    const slide = overview.slides[collage_idx]

    // 遍历所有 dataBinding，将每个 data 数组打平合并成一维数组
    const flattenedData: Array<any> = []
    for (const binding of slide.dataBinding) {
      if (binding.data && Array.isArray(binding.data)) {
        flattenedData.push(...binding.data)
      }
    }

    return flattenedData.length > 0 ? flattenedData : null
  }

  function startContainerAnimation() {
    const containerAnimationStore = useContainerAnimationStore()
    if (!containerAni.value) {
      containerAni.value = (event) => {
        containerAnimationStore.containerAnimation(event)
      }
      paper.view.on('frame', containerAni.value)
    }
  }
  async function updateAnimation() {//每当收到进度信息，检查动画更新情况
    // 如果正在执行，直接返回，防止并发执行
    if (isUpdatingAnimation.value) {
      return
    }

    isUpdatingAnimation.value = true
    try {
      const now_collage = progress.value.now_collage??0;
      const type = progress.value.type??0;
      if (now_collage != now_collage_idx.value && type === 1) {// 如果进行的collage变了，要绘制新的elements
        console.log('1')
      if (process_id.value) {
        const txtData = await getRenderTxtData(process_id.value, now_collage)
        txtArray.value.push(...txtData)
      }

        now_start_idx.value = elements.value.length
        setData(now_collage, now_start_idx.value)
        for (let i = now_start_idx.value; i < posArray.value.length; i++) {
          const base64Source = txtArray.value[i]
          const raster = new paper.Raster({
            source: base64Source,
            position: posArray.value[i],
            opacity: 0,
            dataBinding: dataBindingArray.value[i],
            imgLoaded: false,
            dataLoaded: false,
            dataType: 'marker',
            collage_idx: now_collage,
            onLoad: () => {
              const sx = widthArray.value[i] / raster.width
              const sy = heightArray.value[i] / raster.height
              raster.scale(sx, sy)
              raster.rotate(angleArray.value[i] * (180 / Math.PI))
              raster.imgLoaded = true
            },
            //失败提示
            onError: (e: ErrorEvent) => {
              console.log('onError', e)
            }
          }) as RasterWithProps
          raster.onMouseEnter = (event: paper.Event) => {
            const hoverInfoPanelStore = useHoverInfoPanelStore()
            hoverInfoPanelStore.handleRasterHover(event, raster)
          }
          raster.onMouseLeave = (event: paper.Event) => {
            const hoverInfoPanelStore = useHoverInfoPanelStore()
            hoverInfoPanelStore.handleRasterOut(event, raster)
          }
          // raster.onMouseLeave = () => {
          //   markerToast.value.classList.add('hidden')
          // }
          elements.value.push(raster);
        }
        now_collage_idx.value = now_collage

    }
    else if (elements.value.length === 0) {//一开始
      setData(now_collage, 0)
      console.log('2')
      if (process_id.value != null) {
        const txtData = await getRenderTxtData(process_id.value, now_collage)
        txtArray.value.push(...txtData)
      }
      for (let i = 0; i < posArray.value.length; i++) {
        const base64Source = txtArray.value[i]
        const raster = new paper.Raster({
          source: base64Source,
          position: posArray.value[i],
          opacity: 0,
          dataBinding: dataBindingArray.value[i],
          imgLoaded: false,
          dataLoaded: false,
          dataType: 'marker',
          collage_idx: now_collage,
          onLoad: (_e: Event) => {
            const sx = widthArray.value[i] / raster.width
            const sy = heightArray.value[i] / raster.height
            raster.scale(sx, sy)
            raster.rotate(angleArray.value[i] * (180 / Math.PI))
            raster.imgLoaded = true
          },
          onError: (e: ErrorEvent) => {
            console.log('onError',e)
          }
        }) as RasterWithProps
        raster.onMouseEnter = (event: paper.Event) => {
          const hoverInfoPanelStore = useHoverInfoPanelStore()
          hoverInfoPanelStore.handleRasterHover(event, raster)
        }
        raster.onMouseLeave = (event: paper.Event) => {
          const hoverInfoPanelStore = useHoverInfoPanelStore()
          hoverInfoPanelStore.handleRasterOut(event, raster)
        }
        // raster.onMouseLeave = () => {
        //   markerToast.value.classList.add('hidden')
        // }
        elements.value.push(raster);
      }
    }
    else if (elements.value.length > 0) {
      console.log('3')
      setData(now_collage, now_start_idx.value)
      for (let i = now_start_idx.value; i < elements.value.length; i++) {//这里先set好数据
        if (elements.value[i].imgLoaded) {
          elements.value[i].startPos = new paper.Point(elements.value[i].position);
          elements.value[i].startRotate = elements.value[i].matrix.rotation;
          elements.value[i].startScaleX = elements.value[i].matrix.scaling.x;
          elements.value[i].startScaleY = elements.value[i].matrix.scaling.y;
          elements.value[i].endPos = new paper.Point(posArray.value[i]);
          elements.value[i].endRotate = angleArray.value[i] * (180 / Math.PI);
          elements.value[i].endScaleX = widthArray.value[i] / elements.value[i].width;
          elements.value[i].endScaleY = heightArray.value[i] / elements.value[i].height;
          elements.value[i].elapsedTime = 0;
          elements.value[i].endOpacity = 1;
          elements.value[i].startOpacity = elements.value[i].opacity;
          elements.value[i].dataLoaded = true;
        }
      }

      if (!markerAni.value) {
        markerAni.value = (event: paper.Event) => {
          markerAnimation(event, now_start_idx.value)
        }
        paper.view.on('frame', markerAni.value)
      }

    }
    } finally {
      // 无论成功还是失败，都要清除锁标志
      isUpdatingAnimation.value = false
    }
  }

  function markerAnimation(event: paper.Event, startIndex: number) {
    for (let i = startIndex; i < elements.value.length; i++) {
      const el = elements.value[i] as RasterWithProps
      if (!el?.imgLoaded || !el?.dataLoaded) continue
      const startPos = el.startPos
      const endPos = el.endPos
      if (!startPos || !endPos) continue
      const epsilon = 0.0001
      const pos = new paper.Point(el.position)
      const rotate = el.matrix.rotation
      const opacity = el.opacity
      const startOpacity = el.startOpacity ?? 0
      const endOpacity = el.endOpacity ?? 1
      const startRotate = el.startRotate ?? 0
      const endRotate = el.endRotate ?? 0
      const scaleX = el.matrix.scaling.x
      const startScaleX = el.startScaleX ?? 1
      const endScaleX = el.endScaleX ?? 1
      const scaleY = el.matrix.scaling.y
      const startScaleY = el.startScaleY ?? 1
      const endScaleY = el.endScaleY ?? 1

      const delta = (event as paper.Event & { delta: number }).delta
      const elapsed = (el.elapsedTime ?? 0) + delta
      el.elapsedTime = elapsed
      const t = Math.min(elapsed / (time_interval.value / 1000), 1)

      if (Math.abs(opacity - endOpacity) > epsilon) {
        el.opacity = opacity + (endOpacity - startOpacity) / 200
      }
      if (Math.abs(scaleX - endScaleX) > epsilon || Math.abs(scaleY - endScaleY) > epsilon) {
        const newScaleX = startScaleX + (endScaleX - startScaleX) * t
        const newScaleY = startScaleY + (endScaleY - startScaleY) * t
        el.scaling = new paper.Point(newScaleX, newScaleY)
      }
      if (Math.abs(rotate - endRotate) > epsilon) {
        let delta = endRotate - startRotate
        if (delta > 180) delta -= 360
        else if (delta < -180) delta += 360
        const newRotate = startRotate + delta * t
        el.rotate(newRotate - rotate)
      } else {
        const newRotate = startRotate + (endRotate - startRotate) * t
        el.rotate(newRotate - rotate)
      }
      if (Math.abs(pos.x - endPos.x) > epsilon || Math.abs(pos.y - endPos.y) > epsilon) {
        el.position = new paper.Point(
          startPos.x + (endPos.x - startPos.x) * t,
          startPos.y + (endPos.y - startPos.y) * t
        )
      }
    }
  }

  // 提取replay逻辑为独立方法
  async function executeReplayStep() {
    const now_collage = progress_data.value[replayIdx.value].now_collage??0;
    const now_overview = progress_data.value[replayIdx.value].now_overview_idx;
    process_id.value = progress_data.value[replayIdx.value].process_id??null;
    collage_result_type.value = progress_data.value[replayIdx.value].collage_result_type??[];

    if (now_overview != now_overview_idx.value && now_overview_idx.value != totalOverview.value - 1) {
      nextOverview()
      return
    }

    if (now_collage && now_collage != now_collage_idx.value) {//进入下一个collage
      console.log('4')
      now_start_idx.value = elements.value.length
      setReplayData(replayIdx.value, now_collage, now_start_idx.value)
      for (let i = now_start_idx.value; i < posArray.value.length; i++) {
        const base64Source = txtArray.value[i]
        const raster = new paper.Raster({
          source: base64Source,
          position: posArray.value[i],
          opacity: 0,
          dataBinding: dataBindingArray.value[i],
          imgLoaded: false,
          dataLoaded: false,
          dataType: 'marker',
          collage_idx: now_collage,
          onLoad: () => {
            const sx = widthArray.value[i] / raster.width
            const sy = heightArray.value[i] / raster.height
            raster.scale(sx, sy)
            raster.rotate(angleArray.value[i] * (180 / Math.PI))
            raster.imgLoaded = true;
          },
          onError: (e: ErrorEvent) => {
            console.log('onError',e,raster)
          }
        }) as RasterWithProps
        raster.onMouseEnter = (event: paper.Event) => {
          const hoverInfoPanelStore = useHoverInfoPanelStore()
          hoverInfoPanelStore.handleRasterHover(event, raster)
        }
        raster.onMouseLeave = (event: paper.Event) => {
          const hoverInfoPanelStore = useHoverInfoPanelStore()
          hoverInfoPanelStore.handleRasterOut(event, raster)
        }
        // raster.onMouseLeave = () => {
        //   markerToast.value.classList.add('hidden')
        // }
        elements.value.push(raster);
      }
      now_collage_idx.value = now_collage
    }
    else if (elements.value.length === 0) {
      console.log('5')
      setReplayData(replayIdx.value, now_collage, 0)
      for (let i = 0; i < posArray.value.length; i++) {
        const base64Source = txtArray.value[i]
        const raster = new paper.Raster({
          source: base64Source,
          position: posArray.value[i],
          opacity: 0,
          dataBinding: dataBindingArray.value[i],
          imgLoaded: false,
          dataLoaded: false,
          dataType: 'marker',
          collage_idx: now_collage,
          onLoad: () => {
            const sx = widthArray.value[i] / raster.width
            const sy = heightArray.value[i] / raster.height
            raster.scale(sx, sy)
            raster.rotate(angleArray.value[i] * (180 / Math.PI))
            raster.imgLoaded = true
          },
          onError: (e: ErrorEvent) => {
            console.log('onError',e,raster)
          }
        }) as RasterWithProps
        raster.onMouseEnter = (event: paper.Event) => {
          const hoverInfoPanelStore = useHoverInfoPanelStore()
          hoverInfoPanelStore.handleRasterHover(event, raster)
        }
        raster.onMouseLeave = (event: paper.Event) => {
          const hoverInfoPanelStore = useHoverInfoPanelStore()
          hoverInfoPanelStore.handleRasterOut(event, raster)
        }
        // raster.onMouseLeave = () => {
        //   markerToast.value.classList.add('hidden')
        // }
        elements.value.push(raster);
      }
    }
    else if (elements.value.length > 0) {
      console.log('6')
      setReplayData(replayIdx.value, now_collage, now_start_idx.value)
      for (let i = now_start_idx.value; i < elements.value.length; i++) {//这里先set好数据
        if (elements.value[i].imgLoaded) {
          elements.value[i].startPos = new paper.Point(elements.value[i].position);
          elements.value[i].startRotate = elements.value[i].matrix.rotation;
          elements.value[i].startScaleX = elements.value[i].matrix.scaling.x;
          elements.value[i].startScaleY = elements.value[i].matrix.scaling.y;
          elements.value[i].endPos = new paper.Point(posArray.value[i][0], posArray.value[i][1]);
          elements.value[i].endRotate = angleArray.value[i] * (180 / Math.PI);
          elements.value[i].endScaleX = widthArray.value[i] / elements.value[i].width;
          elements.value[i].endScaleY = heightArray.value[i] / elements.value[i].height;
          elements.value[i].elapsedTime = 0;
          elements.value[i].endOpacity = 1;
          elements.value[i].startOpacity = elements.value[i].opacity;
          elements.value[i].dataLoaded = true;
        }
      }

      if (!markerAni.value) {
        markerAni.value = (event: paper.Event) => {
          markerAnimation(event, now_start_idx.value)
        }
        paper.view.on('frame', markerAni.value)
      }
    }

    replayIdx.value += 1;
    if (replayIdx.value >= result_data.value.length) {
      stopReplay()
    }
  }

  function replay() {
    replaying.value = true
    removeAnimation()
    removeElements()
    resetReplayData()
    startContainerAnimation()
    replayTimer.value = setInterval(() => {
      executeReplayStep()
    }, time_interval.value);
  }

  function nextOverview() {
    now_collage_idx.value = 0
    now_start_idx.value = 0
    removeAnimation()
    removeElements()
    txtArray.value = []
    posArray.value = []
    widthArray.value = []
    heightArray.value = []
    angleArray.value = []
    collage_result_type.value = []
    now_overview_idx.value += 1
  }

  function updateReplayTimer() {
    // 如果正在replay，清除当前timer并重新设定
    if (replaying.value && replayTimer.value) {
      clearInterval(replayTimer.value)
      replayTimer.value = setInterval(() => {
        executeReplayStep()
      }, time_interval.value);
    }
  }

  return {
    // 状态
    collaging,
    progress_data,
    collage_result_type,
    canvas_width,
    canvas_height,
    txtArray,
    posArray,
    widthArray,
    heightArray,
    angleArray,
    elements,
    result_data,
    now_collage_idx,
    now_start_idx,
    markerAni,
    containerAni,
    replayIdx,
    process_id,
    replayTimer,
    time_interval,
    replaying,
    totalOverview,
    now_overview_idx,
    // 计算属性
    progress,
    // 方法
    resetData,
    stopReplay,
    backToEdit,
    resetReplayData,
    removeAnimation,
    removeElements,
    setData,
    setReplayData,
    updateAnimation,
    markerAnimation,
    executeReplayStep,
    replay,
    nextOverview,
    updateReplayTimer,
    startContainerAnimation
  }
})
