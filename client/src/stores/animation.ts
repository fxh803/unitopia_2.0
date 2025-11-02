// src/stores/counterStore.js
import { defineStore, storeToRefs } from 'pinia'
import paper from "paper";
import { useContainerStore } from '~/stores/container'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { ref, computed, watch } from 'vue';

export const useAnimationStore = defineStore('animation', () => {
  // 状态
  const collaging = ref(false)
  const progress_data = ref([])
  const collage_result_type = ref([])
  const canvas_width = ref(0)
  const canvas_height = ref(0)
  const srcArray = ref([])
  const posArray = ref([])
  const widthArray = ref([])
  const heightArray = ref([])
  const angleArray = ref([])
  const elements = ref([])
  const result_data = ref([])
  const dataArray = ref([])
  const attributesArray = ref([])
  const now_collage_idx = ref(0)
  const now_start_idx = ref(0)
  const markerAni = ref(null)
  const containerAni = ref(null)
  const replayIdx = ref(0)
  const ip = ref('http://127.0.0.1:5000')
  const process_id = ref(null)
  const replayTimer = ref(null)
  const time_interval = ref(2000)
  const replaying = ref(false)
  const hoverAttr = ref(null)
  const hoverData = ref(null)
  const totalOverview = ref(0)
  const now_overview_idx = ref(0)

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
    srcArray.value = []
    posArray.value = []
    widthArray.value = []
    heightArray.value = []
    angleArray.value = []
    elements.value = []
    result_data.value = []
    dataArray.value = []
    attributesArray.value = []
    now_collage_idx.value = 0
    now_start_idx.value = 0
    markerAni.value = null
    replayIdx.value = 0
    process_id.value = null
    replayTimer.value = null
    replaying.value = false
    hoverAttr.value = null
    hoverData.value = null
    now_overview_idx.value = 0
    totalOverview.value = 0
    time_interval.value = 2000
  }

  function stopReplay() {
    clearInterval(replayTimer.value);
    paper.view.off('frame', markerAni.value);
    replaying.value = false
  }

  function backToEdit() { 
    resetData()
  }

  function resetReplayData() {
    replayIdx.value = 0
    srcArray.value = []
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
    // 清理container的shining paths
    const containerStore = useContainerStore()
    containerStore.clearShiningPaths()
  }

  function removeElements() { 
    elements.value.forEach(element => {
      element.remove();
    });
    elements.value = []
  }

  function setData(now_collage, startIndex) {//对最新的数据进行整理
    const result = result_data.value[result_data.value.length - 1]
    // 获取当前幻灯片的 render_size
    const collageSeriesStore = useCollageSeriesStore()
    const { overviews, currentOverviewIndex } = storeToRefs(collageSeriesStore)
    const renderSize = overviews.value[currentOverviewIndex.value]?.collageSeries[now_collage]?.render_size ?? 1000
    
    for (let i = startIndex; i < result['pos'].length + startIndex; i++) {
      if (collage_result_type.value[now_collage] === 'svg')
        srcArray.value[i] = `${ip.value}/workdir/${process_id.value}_${now_collage}/render_files/${i + 1 - startIndex}.svg`
      else
        srcArray.value[i] = `${ip.value}/workdir/${process_id.value}_${now_collage}/render_files/${i + 1 - startIndex}.png`

      posArray.value[i] = [result['pos'][i - startIndex][0] * canvas_width.value, result['pos'][i - startIndex][1] * canvas_height.value];
      angleArray.value[i] = result['angle'][i - startIndex];
      dataArray.value[i] = result['data'][i - startIndex];
      attributesArray.value[i] = result['attributes'][i - startIndex];
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

  function setReplayData(idx, now_collage, startIndex) {
    const result = result_data.value[idx]
    // 获取当前幻灯片的 render_size
    const collageSeriesStore = useCollageSeriesStore()
    const { overviews, currentOverviewIndex } = storeToRefs(collageSeriesStore)
    const renderSize = overviews.value[currentOverviewIndex.value]?.collageSeries[now_collage]?.render_size ?? 1000
    
    for (let i = startIndex; i < result['pos'].length + startIndex; i++) {
      if (collage_result_type.value[now_collage] === 'svg')
        srcArray.value[i] = `${ip.value}/workdir/${process_id.value}_${now_collage}/render_files/${i + 1 - startIndex}.svg`
      else
        srcArray.value[i] = `${ip.value}/workdir/${process_id.value}_${now_collage}/render_files/${i + 1 - startIndex}.png`

      posArray.value[i] = [result['pos'][i - startIndex][0] * canvas_width.value, result['pos'][i - startIndex][1] * canvas_height.value];
      angleArray.value[i] = result['angle'][i - startIndex];
      dataArray.value[i] = result['data'][i - startIndex];
      attributesArray.value[i] = result['attributes'][i - startIndex];
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
  function startContainerAnimation() {
    const containerStore = useContainerStore()
    if (!containerAni.value) {  
        containerAni.value = (event) => { 
          containerStore.containerAnimation(event)
        };
        paper.view.on('frame', containerAni.value);  
      }
  }
  function updateAnimation() {//每当收到进度信息，检查动画更新情况
    const now_collage = progress.value.now_collage;
    const type = progress.value.type;
    if (now_collage != now_collage_idx.value && type === 1) {// 如果进行的collage变了，要绘制新的elements
      console.log('1')
      // paper.view.off('frame', markerAni.value); 
      // paper.view.off('frame', containerAni.value);
      // markerAni.value = null
      // containerAni.value = null
      now_start_idx.value = elements.value.length
      setData(now_collage, now_start_idx.value)
      for (let i = now_start_idx.value; i < posArray.value.length; i++) {
        const raster = new paper.Raster({
          source: srcArray.value[i],
          position: posArray.value[i],
          opacity: 0,
          attr: attributesArray.value[i],
          data: dataArray.value[i],
          imgLoaded: false,
          dataLoaded: false,
          collage_idx: now_collage,
          onLoad: () => {
            console.log(srcArray.value[i])
            raster.scale(new paper.Point(widthArray.value[i] / raster.width, heightArray.value[i] / raster.height));
            raster.rotate(angleArray.value[i] * (180 / Math.PI))
            raster.imgLoaded = true;
          },
          //失败提示
          onError: (e) => {
            console.log('onError',e)
          }
        });
        raster.onMouseEnter = () => {
          hoverAttr.value = raster.attr
          hoverData.value = raster.data
          let toastLeft = raster.position.x
          let toastTop = raster.position.y
          // markerToast.value.style.top = `${toastTop}px`
          // markerToast.value.style.left = `${toastLeft}px`
          // markerToast.value.classList.remove('hidden')
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
      for (let i = 0; i < posArray.value.length; i++) {
        const raster = new paper.Raster({
          source: srcArray.value[i],
          position: posArray.value[i],
          opacity: 0,
          attr: attributesArray.value[i],
          data: dataArray.value[i],
          imgLoaded: false,
          dataLoaded: false,
          collage_idx: now_collage,
          onLoad: (e) => {
            console.log(srcArray.value[i])
            raster.scale(new paper.Point(widthArray.value[i] / raster.width, heightArray.value[i] / raster.height));
            raster.rotate(angleArray.value[i] * (180 / Math.PI))
            raster.imgLoaded = true
          },
          onError: (e) => {
            console.log('onError',e)
          }
        });
        raster.onMouseEnter = () => {
          hoverAttr.value = raster.attr
          hoverData.value = raster.data
          let toastLeft = raster.position.x
          let toastTop = raster.position.y
          // markerToast.value.style.top = `${toastTop}px`
          // markerToast.value.style.left = `${toastLeft}px`
          // markerToast.value.classList.remove('hidden')
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
        markerAni.value = (event) => {
          markerAnimation(event, now_start_idx.value);
        };
        paper.view.on('frame', markerAni.value);
      }

    }
  }

  function markerAnimation(event, startIndex) {
    for (let i = startIndex; i < elements.value.length; i++) {
      if (elements.value[i].imgLoaded && elements.value[i].dataLoaded) { 
        const epsilon = 0.0001; // 允许的误差范围
        const pos = new paper.Point(elements.value[i].position);
        const startPos = elements.value[i].startPos;
        const endPos = elements.value[i].endPos;
        const rotate = elements.value[i].matrix.rotation;
        const opacity = elements.value[i].opacity;
        const startOpacity = elements.value[i].startOpacity;
        const endOpacity = elements.value[i].endOpacity;
        const startRotate = elements.value[i].startRotate;
        const endRotate = elements.value[i].endRotate;
        const scaleX = elements.value[i].matrix.scaling.x;
        const startScaleX = elements.value[i].startScaleX;
        const endScaleX = elements.value[i].endScaleX;
        const scaleY = elements.value[i].matrix.scaling.y;
        const startScaleY = elements.value[i].startScaleY;
        const endScaleY = elements.value[i].endScaleY;

        elements.value[i].elapsedTime += event.delta; // 更新经过的时间
        const t = Math.min(elements.value[i].elapsedTime / (time_interval.value / 1000), 1); // 插值比例，限制在 [0, 1]

        if (Math.abs(opacity - endOpacity) > epsilon) {
          const newOpacity = opacity + (endOpacity - startOpacity) / 200
          elements.value[i].opacity = newOpacity;
        }
        if (Math.abs(scaleX - endScaleX) > epsilon || Math.abs(scaleY - endScaleY) > epsilon) {
          const newScaleX = startScaleX + (endScaleX - startScaleX) * t;
          const newScaleY = startScaleY + (endScaleY - startScaleY) * t;
          elements.value[i].scaling = new paper.Point(newScaleX, newScaleY);
        }
        if (Math.abs(rotate - endRotate) > epsilon) {
          if (Math.abs(endRotate - startRotate) > 180) {
            // 调整差值，使其在 -180 到 180 的范围内
            let delta = endRotate - startRotate;
            if (delta > 180) {
              delta -= 360;
            } else if (delta < -180) {
              delta += 360;
            }
            const newRotate = startRotate + delta * t;
            elements.value[i].rotate(newRotate - rotate);
          } else {
            const newRotate = startRotate + (endRotate - startRotate) * t;
            elements.value[i].rotate(newRotate - rotate);
          }

        }
        if (Math.abs(pos.x - endPos.x) > epsilon || Math.abs(pos.y - endPos.y) > epsilon) {
          const newPosition = [startPos.x + (endPos.x - startPos.x) * t, startPos.y + (endPos.y - startPos.y) * t]
          elements.value[i].position = newPosition;
        }
      }
    }
  }

  // 提取replay逻辑为独立方法
  function executeReplayStep() {
    const now_collage = progress_data.value[replayIdx.value].now_collage;
    const now_overview = progress_data.value[replayIdx.value].now_overview_idx;
    process_id.value = progress_data.value[replayIdx.value].process_id;
    collage_result_type.value = progress_data.value[replayIdx.value].collage_result_type;
    
    if (now_overview != now_overview_idx.value && now_overview_idx.value != totalOverview.value - 1) { 
      nextOverview()
      return
    }
    
    if (now_collage != now_collage_idx.value) {//进入下一个collage
      console.log('4')
      now_start_idx.value = elements.value.length
      setReplayData(replayIdx.value, now_collage, now_start_idx.value)
      for (let i = now_start_idx.value; i < posArray.value.length; i++) {
        const raster = new paper.Raster({
          source: srcArray.value[i],
          position: posArray.value[i],
          opacity: 0,
          attr: attributesArray.value[i],
          data: dataArray.value[i],
          imgLoaded: false,
          dataLoaded: false,
          collage_idx: now_collage,
          onLoad: () => {
            console.log(srcArray.value[i])
            raster.scale(new paper.Point(widthArray.value[i] / raster.width, heightArray.value[i] / raster.height));
            raster.rotate(angleArray.value[i] * (180 / Math.PI))
            raster.imgLoaded = true;
          },
          onError: (e) => {
            console.log('onError',e,raster)
          }
        });
        raster.onMouseEnter = () => {
          hoverAttr.value = raster.attr
          hoverData.value = raster.data
          let toastLeft = raster.position.x
          let toastTop = raster.position.y
          // markerToast.value.style.top = `${toastTop}px`
          // markerToast.value.style.left = `${toastLeft}px`
          // markerToast.value.classList.remove('hidden')
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
        const raster = new paper.Raster({
          source: srcArray.value[i],
          position: posArray.value[i],
          opacity: 0,
          attr: attributesArray.value[i],
          data: dataArray.value[i],
          imgLoaded: false,
          dataLoaded: false,
          collage_idx: now_collage,
          onLoad: () => {
            console.log(srcArray.value[i])
            raster.scale(new paper.Point(widthArray.value[i] / raster.width, heightArray.value[i] / raster.height));
            raster.rotate(angleArray.value[i] * (180 / Math.PI))
            raster.imgLoaded = true
          },
          onError: (e) => {
            console.log('onError',e,raster)
          }
        });
        raster.onMouseEnter = () => {
          hoverAttr.value = raster.attr
          hoverData.value = raster.data
          let toastLeft = raster.position.x
          let toastTop = raster.position.y
          // markerToast.value.style.top = `${toastTop}px`
          // markerToast.value.style.left = `${toastLeft}px`
          // markerToast.value.classList.remove('hidden')
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
        markerAni.value = (event) => {
          markerAnimation(event, now_start_idx.value);
        };
        paper.view.on('frame', markerAni.value);
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
    replayTimer.value = setInterval(() => {
      executeReplayStep()
    }, time_interval.value);
  }

  function nextOverview() {
    now_collage_idx.value = 0
    now_start_idx.value = 0
    removeAnimation()
    removeElements()
    srcArray.value = []
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
    srcArray,
    posArray,
    widthArray,
    heightArray,
    angleArray,
    elements,
    result_data,
    dataArray,
    attributesArray,
    now_collage_idx,
    now_start_idx,
    markerAni,
    containerAni,
    replayIdx,
    ip,
    process_id,
    replayTimer,
    time_interval,
    replaying,
    hoverAttr,
    hoverData,
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