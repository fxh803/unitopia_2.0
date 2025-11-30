import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useMarkerStore } from '~/stores/marker'

export interface TableData {
  [key: string]: any
}

export type ConditionOperator = '=' | '>' | '<'

// 单个筛选条件
export interface SingleFilter {
  operator: ConditionOperator
  value: string
  markerId: string | null // 每个 filter 可以有自己的 marker
  data: TableData[] // 该 filter 筛选后的数据
  rows: number[] // 该 filter 筛选后的行索引
}

// Column 筛选卡片接口
export interface ColumnFilterCard {
  id: string
  column: string
  filters: SingleFilter[]
}

export const useTableStore = defineStore('table', () => {
  // 表格数据状态
  const tableData = ref<TableData[]>([])
  const tableColumns = ref<string[]>([])
  const fileName = ref<string>('')
  const isLoading = ref(false)
  
  // 数据映射筛选卡片
  const columnFilterCards = ref<ColumnFilterCard[]>([])

  // 解析 CSV 行
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      ElMessage.error('Please upload a CSV file')
      return
    }

    try {
      isLoading.value = true
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length === 0) {
        ElMessage.error('CSV file is empty')
        return
      }

      // 解析 CSV
      const headers = parseCSVLine(lines[0])
      const data: TableData[] = []
      const maxRows = 300 // 限制最大行数
      const rowsToProcess = Math.min(lines.length - 1, maxRows)

      for (let i = 1; i <= rowsToProcess; i++) {
        const values = parseCSVLine(lines[i])
        const row: TableData = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        data.push(row)
      }

      // 更新状态
      tableData.value = data
      tableColumns.value = headers
      fileName.value = file.name

      const totalRows = lines.length - 1
      const loadedRows = data.length
      ElMessage.success(`Successfully uploaded ${file.name}, loaded ${loadedRows} rows${totalRows > maxRows ? ` (${totalRows} total rows, showing first ${maxRows} rows)` : ''}`)
    } catch (error) {
      ElMessage.error('File parsing failed')
      console.error('CSV parsing error:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 清空表格数据
  const clearTableData = () => {
    tableData.value = []
    tableColumns.value = []
    fileName.value = ''
    columnFilterCards.value = []
  }

  // 设置表格数据
  const setTableData = (data: TableData[], columns: string[]) => {
    tableData.value = data
    tableColumns.value = columns
  }

  return {
    // 状态
    tableData,
    tableColumns,
    fileName,
    isLoading,
    columnFilterCards,
    
    // 方法
    handleFileUpload,
    clearTableData,
    setTableData
  }
}) 