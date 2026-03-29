// src/stores/counterStore.js
import { defineStore } from 'pinia'
import paper from "paper";
import { useContainerAnimationStore } from '~/stores/containerAnimation'
// import { useCollageSeriesStore } from '~/stores/collageSeries'
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
  collage_result_type?: string[]
}

/** 后端返回的拼贴结果项（fetchProgressApi 的 result 字段，用于渲染 marker 等） */
export interface ResultItem {
  angle: number[]
  attributes: (string | null)[]
  data: number[]
  pos: [number, number][]
  size: [number, number][]
  /** 多分辨率信息，含渲染尺寸（可选） */
  multi_res?: {
    render_size_w?: number
    render_size_h?: number
  }
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
  /** 非 collaging 时 hover 前保存的透明度，用于 mouseleave 恢复 */
  _preHoverOpacity?: number
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
  const time_interval = ref(1000)
  const replaying = ref(false)
  // 不再区分多个 overview，相关状态删除
  const isUpdatingAnimation = ref(false) // 锁标志，防止并发执行

  /** Paper.js view 每触发一次 frame 事件 +1；与 marker/container 插值共用同一计数，避免重复累加。结束时在控制台输出累计帧数与平均 FPS */
  const animationFrameCount = ref(0)
  let frameRecorder: ((event: paper.Event) => void) | null = null
  /** 本段统计内第一帧时刻（performance.now），用于计算平均 FPS */
  let frameRecorderStartPerf: number | null = null

  function ensureFrameRecorder() {
    if (frameRecorder) return
    frameRecorder = () => {
      if (frameRecorderStartPerf === null) {
        frameRecorderStartPerf = performance.now()
      }
      animationFrameCount.value++
    }
    paper.view.on('frame', frameRecorder)
  }

  function teardownFrameRecorder() {
    // 未启用 recorder 且无统计数据时，直接返回（幂等且避免无意义重置）
    if (!frameRecorder && animationFrameCount.value === 0 && frameRecorderStartPerf === null) return

    if (frameRecorder) {
      paper.view.off('frame', frameRecorder)
      frameRecorder = null
    }
    const total = animationFrameCount.value
    const start = frameRecorderStartPerf
    frameRecorderStartPerf = null
    if (total > 0 && start !== null) {
      const elapsedMs = performance.now() - start
      const avgFps = elapsedMs >= 1 ? (total * 1000) / elapsedMs : null
      const fpsPart = avgFps != null ? `，平均 FPS: ${avgFps.toFixed(1)}` : ''
      console.log(
        `[animation] Paper.js view 累计帧数: ${total}，统计时长: ${elapsedMs.toFixed(0)} ms${fpsPart}`,
      )
    } else if (total > 0) {
      console.log(`[animation] Paper.js view 累计帧数: ${total}`)
    }
    animationFrameCount.value = 0
  }

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

  function attachRasterHoverHandlers(raster: RasterWithProps) {
    raster.onMouseEnter = (event: paper.Event) => {
      const hoverInfoPanelStore = useHoverInfoPanelStore()
      hoverInfoPanelStore.handleRasterHover(event, raster)
      const el = paper.view?.element
      if (el) el.style.cursor = 'pointer'
      if (!collaging.value) {
        raster._preHoverOpacity = raster.opacity
        raster.opacity = 0.5
      }
    }
    raster.onMouseLeave = (event: paper.Event) => {
      const hoverInfoPanelStore = useHoverInfoPanelStore()
      hoverInfoPanelStore.handleRasterOut(event, raster)
      const el = paper.view?.element
      if (el) el.style.cursor = 'default'
      if (!collaging.value) {
        if (raster._preHoverOpacity !== undefined) {
          raster.opacity = raster._preHoverOpacity
          delete raster._preHoverOpacity
        } else {
          raster.opacity = 1
        }
      }
    }
  }

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
    time_interval.value = 1000
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
    time_interval.value = 1000
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
    teardownFrameRecorder()
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
    console.log('result', result)
    if (result == null) return
    const dataBinding = getDataBinding(now_collage)
    let renderSizeWidth = result.multi_res?.render_size_w ?? canvas_width.value
    let renderSizeHeight = result.multi_res?.render_size_h ?? canvas_height.value

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
      widthArray.value[i] = result['size'][i - startIndex][0] * originSize * (canvas_width.value / renderSizeWidth);
      heightArray.value[i] = result['size'][i - startIndex][1] * originSize * (canvas_height.value / renderSizeHeight);
    }
  }

  function setReplayData(idx: number, now_collage: number, startIndex: number) {
    const result = result_data.value[idx]
    if (result == null) return
    const dataBinding = getDataBinding(now_collage)
    let renderSizeWidth = result.multi_res?.render_size_w ?? canvas_width.value
    let renderSizeHeight = result.multi_res?.render_size_h ?? canvas_height.value

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
      widthArray.value[i] = result['size'][i - startIndex][0] * originSize * (canvas_width.value / renderSizeWidth);
      heightArray.value[i] = result['size'][i - startIndex][1] * originSize * (canvas_height.value / renderSizeHeight);
    }
  }
  // 根据 collage_idx 获取对应的 dataBinding，打平成一维数组（仅当前 overview）
  function getDataBinding(collage_idx: number): Array<any> | null {
    const hoverInfoPanelStore = useHoverInfoPanelStore()
    const allData = hoverInfoPanelStore.allData
    const slide = allData[collage_idx]

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
        // console.log('1')
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
          attachRasterHoverHandlers(raster)
          elements.value.push(raster);
        }
        now_collage_idx.value = now_collage

    }
    else if (elements.value.length === 0) {//一开始
      setData(now_collage, 0)
      // console.log('2')
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
        attachRasterHoverHandlers(raster)
        elements.value.push(raster);
      }
    }
    else if (elements.value.length > 0) {
      // console.log('3')
      ensureFrameRecorder()
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

      el.opacity = startOpacity + (endOpacity - startOpacity) * t
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
    process_id.value = progress_data.value[replayIdx.value].process_id??null;
    collage_result_type.value = progress_data.value[replayIdx.value].collage_result_type??[];

    if (now_collage && now_collage != now_collage_idx.value) {//进入下一个collage
      // console.log('4')
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
        attachRasterHoverHandlers(raster)
        elements.value.push(raster);
      }
      now_collage_idx.value = now_collage
    }
    else if (elements.value.length === 0) {
      // console.log('5')
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
        attachRasterHoverHandlers(raster)
        elements.value.push(raster);
      }
    }
    else if (elements.value.length > 0) {
      // console.log('6')
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
    animationFrameCount,
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
    updateReplayTimer,
    startContainerAnimation
  }
})
