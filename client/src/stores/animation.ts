// src/stores/counterStore.js
import { defineStore, storeToRefs } from 'pinia'
import paper from "paper";
export const useAnimationStore = defineStore('animation', {
  state: () => ({
    collaging: false,
    progress_data: [],
    collage_result_type: [],
    canvas_width: 0,
    canvas_height: 0,
    srcArray: [],
    posArray: [],
    widthArray: [],
    heightArray: [],
    angleArray: [],
    elements: [],
    result_data: [],
    dataArray: [],
    attributesArray: [],
    now_collage_idx: 0,
    now_start_idx: 0, 
    markerAni: null, 
    replayIdx: 0,
    ip: 'http://127.0.0.1:5000',
    process_id: null,
    replayTimer:null,
    time_interval: 2000,
    replaying: false,
    hoverAttr: null,
    hoverData: null,
    totalOverview:0,
    now_overview_idx:0

  }),
  getters: { 
    progress: (state) => {
      return state.progress_data[state.progress_data.length - 1]
    }
  },
  actions: { 
    resetData() {
      this.collaging = false
      this.progress_data = []
      this.collage_result_type = []
      this.canvas_width = 0
      this.canvas_height = 0
      this.srcArray = []
      this.posArray = []
      this.widthArray = []
      this.heightArray = []
      this.angleArray = []
      this.elements = []
      this.result_data = []
      this.dataArray = []
      this.attributesArray = []
      this.now_collage_idx = 0
      this.now_start_idx = 0
      this.markerAni = null
      this.replayIdx = 0
      this.process_id = null
      this.replayTimer = null
      this.replaying = false
      this.hoverAttr = null
      this.hoverData = null
      this.now_overview_idx = 0
      this.totalOverview = 0
    },
    stopReplay() {
      clearInterval(this.replayTimer);
      paper.view.off('frame', this.markerAni);
      this.replaying = false
    },
    backToEdit() { 
      this.resetData()
    },
    resetReplayData() {
      this.replayIdx = 0
      this.srcArray = []
      this.posArray = []
      this.widthArray = []
      this.heightArray = []
      this.angleArray = []
      this.now_collage_idx = 0
      this.now_start_idx = 0
      this.now_overview_idx = 0
    },
    removeAnimation() {
      if (this.markerAni) {
        paper.view.off('frame', this.markerAni);
        this.markerAni = null
      } 
    },
    removeElements() {
      this.elements.forEach(element => {
        element.remove();
      });
      this.elements = []
    },
    setData(now_collage, startIndex) {//对最新的数据进行整理
      const result = this.result_data[this.result_data.length - 1]
      console.log(this.collage_result_type)
      for (let i = startIndex; i < result['pos'].length + startIndex; i++) {
        if (this.collage_result_type[now_collage] === 'svg')
          this.srcArray[i] = `${this.ip}/workdir/${this.process_id}_${now_collage}/render_files/${i + 1 - startIndex}.svg`
        else
          this.srcArray[i] = `${this.ip}/workdir/${this.process_id}_${now_collage}/render_files/${i + 1 - startIndex}.png`

        this.posArray[i] = [result['pos'][i - startIndex][0] * this.canvas_width, result['pos'][i - startIndex][1] * this.canvas_height];
        this.angleArray[i] = result['angle'][i - startIndex];
        this.dataArray[i] = result['data'][i - startIndex];
        this.attributesArray[i] = result['attributes'][i - startIndex];
        let originSize = 0
        if (this.collage_result_type[now_collage] === 'svg') {
          originSize = 100
        }
        else {
          originSize = 500
        }
        this.widthArray[i] = result['size'][i - startIndex][0] * originSize * (this.canvas_width / 1000);
        this.heightArray[i] = result['size'][i - startIndex][1] * originSize * (this.canvas_width / 1000);


      }
    },
    setReplayData(idx, now_collage, startIndex) {
      const result = this.result_data[idx]
      for (let i = startIndex; i < result['pos'].length + startIndex; i++) {
        if (this.collage_result_type[now_collage] === 'svg')
          this.srcArray[i] = `${this.ip}/workdir/${this.process_id}_${now_collage}/render_files/${i + 1 - startIndex}.svg`
        else
          this.srcArray[i] = `${this.ip}/workdir/${this.process_id}_${now_collage}/render_files/${i + 1 - startIndex}.png`

        this.posArray[i] = [result['pos'][i - startIndex][0] * this.canvas_width, result['pos'][i - startIndex][1] * this.canvas_height];
        this.angleArray[i] = result['angle'][i - startIndex];
        this.dataArray[i] = result['data'][i - startIndex];
        this.attributesArray[i] = result['attributes'][i - startIndex];
        let originSize = 0
        if (this.collage_result_type[now_collage] === 'svg') {
          originSize = 100
        }
        else {
          originSize = 500
        }
        this.widthArray[i] = result['size'][i - startIndex][0] * originSize * (this.canvas_width / 1000);
        this.heightArray[i] = result['size'][i - startIndex][1] * originSize * (this.canvas_width / 1000);
      }
    },
    updateAnimation() {//每当收到进度信息，检查动画更新情况
      const now_collage = this.progress.now_collage;
      const type = this.progress.type;
      if (now_collage != this.now_collage_idx && type === 1) {// 如果进行的collage变了，要绘制新的elements
        console.log('1')
        paper.view.off('frame', this.markerAni); 
        this.markerAni = null

        this.now_start_idx = this.elements.length
        this.setData(now_collage, this.now_start_idx)
        for (let i = this.now_start_idx; i < this.posArray.length; i++) {
          const raster = new paper.Raster({
            source: this.srcArray[i],
            position: this.posArray[i],
            opacity: 0,
            attr: this.attributesArray[i],
            data: this.dataArray[i],
            imgLoaded: false,
            dataLoaded: false,
            collage_idx: now_collage,
            onLoad: () => {
              raster.scale(new paper.Point(this.widthArray[i] / raster.width, this.heightArray[i] / raster.height));
              raster.rotate(this.angleArray[i] * (180 / Math.PI))
              raster.imgLoaded = true;
            },
            //失败提示
            onError: (e) => {
              console.log('onError',e)
            }
          });
          raster.onMouseEnter = () => {
            this.hoverAttr = raster.attr
            this.hoverData = raster.data
            let toastLeft = raster.position.x
            let toastTop = raster.position.y
            // markerToast.value.style.top = `${toastTop}px`
            // markerToast.value.style.left = `${toastLeft}px`
            // markerToast.value.classList.remove('hidden')
          }
          // raster.onMouseLeave = () => {
          //   markerToast.value.classList.add('hidden')
          // }
          this.elements.push(raster);
        }
        this.now_collage_idx = now_collage

      }
      else if (this.elements.length === 0) {//一开始
        this.setData(now_collage, 0)
        console.log('2')
        for (let i = 0; i < this.posArray.length; i++) {
          const raster = new paper.Raster({
            source: this.srcArray[i],
            position: this.posArray[i],
            opacity: 0,
            attr: this.attributesArray[i],
            data: this.dataArray[i],
            imgLoaded: false,
            dataLoaded: false,
            collage_idx: now_collage,
            onLoad: (e) => {
              raster.scale(new paper.Point(this.widthArray[i] / raster.width, this.heightArray[i] / raster.height));
              raster.rotate(this.angleArray[i] * (180 / Math.PI))
              raster.imgLoaded = true
            },
            onError: (e) => {
              console.log('onError',e)
            }
          });
          raster.onMouseEnter = () => {
            this.hoverAttr = raster.attr
            this.hoverData = raster.data
            let toastLeft = raster.position.x
            let toastTop = raster.position.y
            // markerToast.value.style.top = `${toastTop}px`
            // markerToast.value.style.left = `${toastLeft}px`
            // markerToast.value.classList.remove('hidden')
          }
          // raster.onMouseLeave = () => {
          //   markerToast.value.classList.add('hidden')
          // }
          this.elements.push(raster);
        } 
      }
      else if (this.elements.length > 0) {
        console.log('3')
        this.setData(now_collage, this.now_start_idx)
        for (let i = this.now_start_idx; i < this.elements.length; i++) {//这里先set好数据
          if (this.elements[i].imgLoaded) {
            this.elements[i].startPos = new paper.Point(this.elements[i].position);
            this.elements[i].startRotate = this.elements[i].matrix.rotation;
            this.elements[i].startScaleX = this.elements[i].matrix.scaling.x;
            this.elements[i].startScaleY = this.elements[i].matrix.scaling.y;
            this.elements[i].endPos = new paper.Point(this.posArray[i]);
            this.elements[i].endRotate = this.angleArray[i] * (180 / Math.PI);
            this.elements[i].endScaleX = this.widthArray[i] / this.elements[i].width;
            this.elements[i].endScaleY = this.heightArray[i] / this.elements[i].height;
            this.elements[i].elapsedTime = 0;
            this.elements[i].endOpacity = 1;
            this.elements[i].startOpacity = this.elements[i].opacity;
            this.elements[i].dataLoaded = true;
          }
        }

        if (!this.markerAni) {
          this.markerAni = (event) => {
            this.markerAnimation(event, this.now_start_idx);
          };
          paper.view.on('frame', this.markerAni);
        }

      }
    },
    markerAnimation(event, startIndex) {
      for (let i = startIndex; i < this.elements.length; i++) {
        if (this.elements[i].imgLoaded && this.elements[i].dataLoaded) { 
          const epsilon = 0.0001; // 允许的误差范围
          const pos = new paper.Point(this.elements[i].position);
          const startPos = this.elements[i].startPos;
          const endPos = this.elements[i].endPos;
          const rotate = this.elements[i].matrix.rotation;
          const opacity = this.elements[i].opacity;
          const startOpacity = this.elements[i].startOpacity;
          const endOpacity = this.elements[i].endOpacity;
          const startRotate = this.elements[i].startRotate;
          const endRotate = this.elements[i].endRotate;
          const scaleX = this.elements[i].matrix.scaling.x;
          const startScaleX = this.elements[i].startScaleX;
          const endScaleX = this.elements[i].endScaleX;
          const scaleY = this.elements[i].matrix.scaling.y;
          const startScaleY = this.elements[i].startScaleY;
          const endScaleY = this.elements[i].endScaleY;

          this.elements[i].elapsedTime += event.delta; // 更新经过的时间
          const t = Math.min(this.elements[i].elapsedTime / (this.time_interval / 1000), 1); // 插值比例，限制在 [0, 1]

          if (Math.abs(opacity - endOpacity) > epsilon) {
            const newOpacity = opacity + (endOpacity - startOpacity) / 200
            this.elements[i].opacity = newOpacity;
          }
          if (Math.abs(scaleX - endScaleX) > epsilon || Math.abs(scaleY - endScaleY) > epsilon) {
            const newScaleX = startScaleX + (endScaleX - startScaleX) * t;
            const newScaleY = startScaleY + (endScaleY - startScaleY) * t;
            this.elements[i].scaling = new paper.Point(newScaleX, newScaleY);
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
              this.elements[i].rotate(newRotate - rotate);
            } else {
              const newRotate = startRotate + (endRotate - startRotate) * t;
              this.elements[i].rotate(newRotate - rotate);
            }

          }
          if (Math.abs(pos.x - endPos.x) > epsilon || Math.abs(pos.y - endPos.y) > epsilon) {
            const newPosition = [startPos.x + (endPos.x - startPos.x) * t, startPos.y + (endPos.y - startPos.y) * t]
            this.elements[i].position = newPosition;
          }
        }
      }
    },
    replay() {
      this.replaying = true
      this.removeAnimation()
      this.removeElements()
      this.resetReplayData()
      this.replayTimer = setInterval(() => {
        const now_collage = this.progress_data[this.replayIdx].now_collage;
        const now_overview = this.progress_data[this.replayIdx].now_overview_idx;
        this.process_id = this.progress_data[this.replayIdx].process_id;
        this.collage_result_type = this.progress_data[this.replayIdx].collage_result_type;
        if (now_overview != this.now_overview_idx && this.now_overview_idx != this.totalOverview - 1) {
          console.log('nextOverview')
          this.nextOverview()
          return
        }
        if (now_collage != this.now_collage_idx) {//进入下一个collage
          console.log('4')
          this.now_start_idx = this.elements.length
          this.setReplayData(this.replayIdx, now_collage, this.now_start_idx)
          for (let i = this.now_start_idx; i < this.posArray.length; i++) {
            const raster = new paper.Raster({
              source: this.srcArray[i],
              position: this.posArray[i],
              opacity: 0,
              attr: this.attributesArray[i],
              data: this.dataArray[i],
              imgLoaded: false,
              dataLoaded: false,
              collage_idx: now_collage,
              onLoad: () => {
                raster.scale(new paper.Point(this.widthArray[i] / raster.width, this.heightArray[i] / raster.height));
                raster.rotate(this.angleArray[i] * (180 / Math.PI))
                raster.imgLoaded = true;
              },
              onError: (e) => {
                console.log('onError',e,raster)
              }
            });
            raster.onMouseEnter = () => {
              this.hoverAttr = raster.attr
              this.hoverData = raster.data
              let toastLeft = raster.position.x
              let toastTop = raster.position.y
              // markerToast.value.style.top = `${toastTop}px`
              // markerToast.value.style.left = `${toastLeft}px`
              // markerToast.value.classList.remove('hidden')
            }
            // raster.onMouseLeave = () => {
            //   markerToast.value.classList.add('hidden')
            // }
            this.elements.push(raster);
          }
          this.now_collage_idx = now_collage
        }
        else if (this.elements.length === 0) {
          console.log('5')
          this.setReplayData(this.replayIdx, now_collage, 0)
          for (let i = 0; i < this.posArray.length; i++) {
            const raster = new paper.Raster({
              source: this.srcArray[i],
              position: this.posArray[i],
              opacity: 0,
              attr: this.attributesArray[i],
              data: this.dataArray[i],
              imgLoaded: false,
              dataLoaded: false,
              collage_idx: now_collage,
              onLoad: () => {
                raster.scale(new paper.Point(this.widthArray[i] / raster.width, this.heightArray[i] / raster.height));
                raster.rotate(this.angleArray[i] * (180 / Math.PI))
                raster.imgLoaded = true
              },
              onError: (e) => {
                console.log('onError',e,raster)
              }
            });
            raster.onMouseEnter = () => {
              this.hoverAttr = raster.attr
              this.hoverData = raster.data
              let toastLeft = raster.position.x
              let toastTop = raster.position.y
              // markerToast.value.style.top = `${toastTop}px`
              // markerToast.value.style.left = `${toastLeft}px`
              // markerToast.value.classList.remove('hidden')
            }
            // raster.onMouseLeave = () => {
            //   markerToast.value.classList.add('hidden')
            // }
            this.elements.push(raster);
          }

        }
        else if (this.elements.length > 0) {
          console.log('6')
          this.setReplayData(this.replayIdx, now_collage, this.now_start_idx)
          for (let i = this.now_start_idx; i < this.elements.length; i++) {//这里先set好数据
            if (this.elements[i].imgLoaded) {
              this.elements[i].startPos = new paper.Point(this.elements[i].position);
              this.elements[i].startRotate = this.elements[i].matrix.rotation;
              this.elements[i].startScaleX = this.elements[i].matrix.scaling.x;
              this.elements[i].startScaleY = this.elements[i].matrix.scaling.y;
              this.elements[i].endPos = new paper.Point(this.posArray[i]);
              this.elements[i].endRotate = this.angleArray[i] * (180 / Math.PI);
              this.elements[i].endScaleX = this.widthArray[i] / this.elements[i].width;
              this.elements[i].endScaleY = this.heightArray[i] / this.elements[i].height;
              this.elements[i].elapsedTime = 0;
              this.elements[i].endOpacity = 1;
              this.elements[i].startOpacity = this.elements[i].opacity;
              this.elements[i].dataLoaded = true;
            }
          }

          if (!this.markerAni) {
            this.markerAni = (event) => {
              this.markerAnimation(event, this.now_start_idx);
            };
            paper.view.on('frame', this.markerAni);
          }

        }
        this.replayIdx += 1;
        if (this.replayIdx >= this.result_data.length) {
          this.stopReplay()
        }
      }, this.time_interval);
    },
    nextOverview() {
      this.now_collage_idx = 0
      this.now_start_idx = 0
      this.collage_result_type = []
      this.removeAnimation()
      this.removeElements()
      this.now_overview_idx += 1
    }
  },
})
