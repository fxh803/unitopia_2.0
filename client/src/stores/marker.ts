import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTableStore } from '~/stores/table'

export type FilterType = 'range' | 'condition'
export type ConditionOperator = '=' | '>' | '<'

export interface RangeFilter {
  type: 'range'
  start: number
  end: number
}

export interface ConditionFilter {
  type: 'condition'
  column: string
  operator: ConditionOperator
  value: string
}

export type Filter = RangeFilter | ConditionFilter

export interface MarkerData {
  id: string
  thumbnail: string
  jsonData: any
  filters: Filter[]
  cols: Set<number>  // 记录筛选后的行索引（使用 Set 提高查找性能）
}

export const useMarkerStore = defineStore('marker', () => {
  // 存储所有 marker 数据
  const markers = ref<MarkerData[]>([])
  
  // 添加新的 marker
  const addMarker = (marker: Omit<MarkerData, 'id' | 'filters' | 'cols'>) => {
    const newMarker: MarkerData = {
      ...marker,
      id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filters: [],
      cols: new Set<number>()
    }
    markers.value.push(newMarker)
    return newMarker
  }
  
  // 删除 marker
  const deleteMarker = (id: string) => {
    const markerIndex = markers.value.findIndex(marker => marker.id === id)
    if (markerIndex !== -1) {
      markers.value.splice(markerIndex, 1)
      return true
    }
    return false
  }
  
  // 清空所有 markers
  const clearAllMarkers = () => {
    markers.value = []
  }
  
  // 重置所有 marker 的筛选条件
  const resetAllMarkerMappings = () => {
    markers.value.forEach(marker => {
      marker.filters = []
      marker.cols = new Set<number>()
    })
  }
  
  // 计算并更新 marker 的筛选行索引
  const calculateMarkerCols = (markerId: string) => {
    const markerIndex = markers.value.findIndex(m => m.id === markerId)
    if (markerIndex === -1) return
    
    const tableStore = useTableStore()
    const tableData = tableStore.tableData
    
    const marker = markers.value[markerIndex]
    const filters = marker.filters
    
    if (filters.length === 0) {
      marker.cols = new Set<number>()
      return
    }
    
    // 所有 filter 都做交集
    const filterResults: Set<number>[] = []
    
    filters.forEach(filter => {
      const matchedIndices = new Set<number>()
      
      if (filter.type === 'range' && filter.start !== -1 && filter.end !== -1) {
        const start = filter.start > 0 ? filter.start - 1 : 0
        const end = filter.end > 0 ? filter.end : tableData.length
        for (let i = start; i < end && i < tableData.length; i++) {
          matchedIndices.add(i)
        }
      } else if (filter.type === 'condition' && filter.column && filter.value !== '') {
        tableData.forEach((row, index) => {
          const cellValue = row[filter.column]
          const filterValue = filter.value
          let matches = false
          
          // 尝试将值转换为数字进行比较
          const cellNum = Number(cellValue)
          const filterNum = Number(filterValue)
          const isNumeric = !isNaN(cellNum) && !isNaN(filterNum) && cellValue !== '' && filterValue !== ''
          
          if (isNumeric) {
            // 数值比较
            switch (filter.operator) {
              case '=':
                matches = cellNum === filterNum
                break
              case '>':
                matches = cellNum > filterNum
                break
              case '<':
                matches = cellNum < filterNum
                break
            }
          } else {
            // 字符串比较（只支持等于）
            if (filter.operator === '=') {
              matches = String(cellValue || '') === filterValue
            }
          }
          
          if (matches) {
            matchedIndices.add(index)
          }
        })
      }
      
      if (matchedIndices.size > 0) {
        filterResults.push(matchedIndices)
      }
    })
    
    // 对所有 filter 结果取交集
    if (filterResults.length === 0) {
      marker.cols = new Set<number>()
    } else {
      let resultIndices = filterResults[0]
      for (let i = 1; i < filterResults.length; i++) {
        resultIndices = new Set([...resultIndices].filter(idx => filterResults[i].has(idx)))
      }
      marker.cols = resultIndices
    }
  }
  
  // 获取 marker 的筛选条件
  const getMarkerFilters = (markerId: string) => {
    const marker = markers.value.find(m => m.id === markerId)
    return marker?.filters || []
  }
  
  // 添加筛选条件
  const addFilter = (markerId: string, filterType: FilterType) => {
    const markerIndex = markers.value.findIndex(m => m.id === markerId)
    if (markerIndex === -1) return null
    
    let newFilter: Filter
    
    if (filterType === 'range') {
      newFilter = {
        type: 'range',
        start: -1,
        end: -1
      }
    } else {
      newFilter = {
        type: 'condition',
        column: '',
        operator: '=',
        value: ''
      }
    }
    
    markers.value[markerIndex].filters.push(newFilter)
    return newFilter
  }
  
  // 删除筛选条件
  const removeFilter = (markerId: string, filterIndex: number) => {
    const markerIndex = markers.value.findIndex(m => m.id === markerId)
    if (markerIndex === -1) return
    
    const filters = markers.value[markerIndex].filters
    if (filterIndex >= 0 && filterIndex < filters.length) {
      filters.splice(filterIndex, 1)
      // 立即计算 cols
      calculateMarkerCols(markerId)
    }
  }
  
  // 更新 Range 筛选条件
  const updateRangeFilter = (markerId: string, filterIndex: number, start: number, end: number) => {
    const markerIndex = markers.value.findIndex(m => m.id === markerId)
    if (markerIndex === -1) return
    
    const filter = markers.value[markerIndex].filters[filterIndex]
    if (filter && filter.type === 'range') {
      filter.start = start
      filter.end = end 
      if (start!==-1 && end!==-1) {
        calculateMarkerCols(markerId)
      }
    }
  }
  
  // 更新 Condition 筛选条件
  const updateConditionFilter = (markerId: string, filterIndex: number, column: string, operator: ConditionOperator, value: string) => {
    const markerIndex = markers.value.findIndex(m => m.id === markerId)
    if (markerIndex === -1) return
    
    const filter = markers.value[markerIndex].filters[filterIndex]
    if (filter && filter.type === 'condition') {
      filter.column = column
      filter.operator = operator
      filter.value = value 

      if (column!=='' && value!=='') {
        calculateMarkerCols(markerId)
      }  
    }
  }
  
  return {
    markers,
    addMarker, 
    deleteMarker,
    clearAllMarkers,
    getMarkerFilters,
    resetAllMarkerMappings,
    addFilter,
    removeFilter,
    updateRangeFilter,
    updateConditionFilter,
    calculateMarkerCols
  }
})
