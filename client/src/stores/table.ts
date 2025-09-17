import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useMarkerStore } from '~/stores/marker'

interface TableData {
  [key: string]: any
}

export const useTableStore = defineStore('table', () => {
  // 表格数据状态
  const tableData = ref<TableData[]>([])
  const tableColumns = ref<string[]>([])
  const isLoading = ref(false)

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
    
    // 重置所有 marker 的 mapping 配置为默认值
    const markerStore = useMarkerStore()
    markerStore.resetAllMarkerMappings()
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
    isLoading,
    
    // 方法
    handleFileUpload,
    clearTableData,
    setTableData
  }
}) 