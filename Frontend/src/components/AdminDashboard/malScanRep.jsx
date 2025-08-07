import React, { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const DoubleBarGraph = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch data:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <p>Loading chart data...</p>
  if (error) return <p>Error loading data: {error}</p>

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="username" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="maliciousUploadCount"
          fill="#ff4d4f" // Red color for malicious
          name="Malicious Uploads"
        />
        <Bar
          dataKey="cleanUploadCount"
          fill="#1890ff" // Blue color for clean
          name="Clean Uploads"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default DoubleBarGraph