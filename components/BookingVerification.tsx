"use client"

import React, { useState, useEffect } from "react"
import { supabaseClient } from "../lib/auth"
import { QRScanner } from "./qr-scanner"

interface BookingVerificationProps {
  userRole: string | null
  branchOrigin: string | null
}

interface BookingData {
  id: string
  awb_no: string
  awb_date: string
  nama_pengirim: string
  nama_penerima: string
  kota_tujuan: string
  kecamatan: string
  coli: number
  berat_kg: number
  total: number
  status: string
  payment_status: string
  agent_id: string
  agent_name?: string
  agent_email?: string
  input_time: string
  isi_barang: string
  alamat_penerima: string
  nomor_pengirim: string
  nomor_penerima: string
  kirim_via: string
  metode_pembayaran: string
  agent_customer: string
  harga_per_kg: number
  sub_total: number
  biaya_admin: number
  biaya_packaging: number
  biaya_transit: number
  origin_branch: string
}

export default function BookingVerification({ userRole, branchOrigin }: BookingVerificationProps) {
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyAction, setVerifyAction] = useState<'verify' | 'reject' | ''>("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [editableData, setEditableData] = useState<Partial<BookingData>>({})
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scannedAWB, setScannedAWB] = useState("")

  // Function to get agent details from users table
  const getAgentDetails = async (agentId: string) => {
    try {
      const { data: userData, error } = await supabaseClient
        .from('users')
        .select('name, email')
        .eq('id', agentId)
        .single()
      
      if (error || !userData) {
        return { name: 'Unknown Agent', email: 'unknown@email.com' }
      }
      
      return userData
    } catch (err) {
      return { name: 'Unknown Agent', email: 'unknown@email.com' }
    }
  }

  // Fungsi refresh sederhana
  const refreshBookings = () => {
    setIsProcessing(prev => !prev) // Trigger useEffect refresh
  }
  useEffect(() => {
    setLoading(true)
    let query = supabaseClient
      .from('manifest_booking')
      .select('*')
      .eq('status', 'pending')
      .order('input_time', { ascending: true })

    // Filter berdasarkan role dan branch seperti di HistoryManifest
    if (userRole === 'cabang' && branchOrigin) {
      query = query.eq('origin_branch', branchOrigin)
    } else if (userRole === 'admin' && branchOrigin) {
      query = query.eq('origin_branch', branchOrigin)
    }

    query.then(async ({ data, error: fetchError }) => {
      if (fetchError) {
        setError("Gagal mengambil data booking: " + fetchError.message)
        setLoading(false)
        return
      }

      // Transform data untuk include agent info
      const transformedData = await Promise.all((data || []).map(async (booking: Record<string, unknown>) => {
        const agentDetails = booking.agent_id ? await getAgentDetails(booking.agent_id as string) : { name: 'Unknown', email: 'Unknown' }
        return {
          ...booking,
          agent_name: agentDetails.name,
          agent_email: agentDetails.email
        } as BookingData
      }))
      
      setBookings(transformedData)
      setLoading(false)
    })
  }, [userRole, branchOrigin, isProcessing]) // Refresh saat ada perubahan processing

  const handleOpenVerifyModal = (booking: BookingData, action: 'verify' | 'reject') => {
    setSelectedBooking(booking)
    setVerifyAction(action)
    setEditableData({
      berat_kg: booking.berat_kg,
      coli: booking.coli,
      harga_per_kg: booking.harga_per_kg,
      biaya_admin: booking.biaya_admin,
      biaya_packaging: booking.biaya_packaging,
      biaya_transit: booking.biaya_transit
    })
    setRejectionReason("")
    setShowVerifyModal(true)
  }

  const handleCloseModal = () => {
    setShowVerifyModal(false)
    setSelectedBooking(null)
    setVerifyAction("")
    setRejectionReason("")
    setEditableData({})
  }

  // QR Scanner Functions
  const handleQRScan = (scannedText: string) => {
    setScannedAWB(scannedText)
    searchBookingByAWB(scannedText)
  }

  const closeQRScanner = () => {
    setShowQRScanner(false)
  }

  const searchBookingByAWB = async (awbNo: string) => {
    if (!awbNo.trim()) return

    try {
      setLoading(true)
      let query = supabaseClient
        .from('manifest_booking')
        .select('*')
        .eq('awb_no', awbNo.trim())
        .eq('status', 'pending')

      // Filter berdasarkan role dan branch seperti main query
      if (userRole === 'cabang' && branchOrigin) {
        query = query.eq('origin_branch', branchOrigin)
      } else if (userRole === 'admin' && branchOrigin) {
        query = query.eq('origin_branch', branchOrigin)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError("Gagal mencari booking: " + fetchError.message)
        return
      }

      if (data && data.length > 0) {
        const agentDetails = data[0].agent_id ? await getAgentDetails(data[0].agent_id) : { name: 'Unknown', email: 'Unknown' }
        const booking = {
          ...data[0],
          agent_name: agentDetails.name,
          agent_email: agentDetails.email
        }
        // Langsung buka modal verifikasi
        handleOpenVerifyModal(booking, 'verify')
        setScannedAWB("")
        closeQRScanner()
      } else {
        setError(`Booking dengan AWB ${awbNo} tidak ditemukan atau sudah diverifikasi`)
      }
    } catch (err) {
      setError("Terjadi kesalahan: " + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleManualAWBSearch = () => {
    if (scannedAWB.trim()) {
      searchBookingByAWB(scannedAWB)
    }
  }

  const calculateTotal = () => {
    const subTotal = (editableData.berat_kg || 0) * (editableData.harga_per_kg || 0)
    const total = subTotal + (editableData.biaya_admin || 0) + (editableData.biaya_packaging || 0) + (editableData.biaya_transit || 0)
    return { subTotal, total }
  }

  const handleProcessVerification = async () => {
    if (!selectedBooking) return

    setIsProcessing(true)
    try {
      if (verifyAction === 'verify') {
        // Calculate updated totals
        const { subTotal, total } = calculateTotal()

        // 1. Update booking status
        const { error: updateError } = await supabaseClient
          .from('manifest_booking')
          .update({
            status: 'verified',
            verified_time: new Date().toISOString(),
            // Update dengan data yang sudah diverifikasi
            berat_kg: editableData.berat_kg,
            coli: editableData.coli,
            harga_per_kg: editableData.harga_per_kg,
            sub_total: subTotal,
            biaya_admin: editableData.biaya_admin,
            biaya_packaging: editableData.biaya_packaging,
            biaya_transit: editableData.biaya_transit,
            total: total
          })
          .eq('id', selectedBooking.id)

        if (updateError) {
          setError("Gagal memverifikasi booking: " + updateError.message)
          return
        }

        // 2. Insert into manifest_cabang
        const manifestData = {
          awb_no: selectedBooking.awb_no,
          awb_date: selectedBooking.awb_date,
          kirim_via: selectedBooking.kirim_via,
          kota_tujuan: selectedBooking.kota_tujuan,
          kecamatan: selectedBooking.kecamatan,
          metode_pembayaran: selectedBooking.metode_pembayaran,
          agent_customer: selectedBooking.agent_customer,
          nama_pengirim: selectedBooking.nama_pengirim,
          nomor_pengirim: selectedBooking.nomor_pengirim || "",
          nama_penerima: selectedBooking.nama_penerima,
          nomor_penerima: selectedBooking.nomor_penerima || "",
          alamat_penerima: selectedBooking.alamat_penerima || "",
          coli: editableData.coli,
          berat_kg: editableData.berat_kg,
          harga_per_kg: editableData.harga_per_kg,
          sub_total: subTotal,
          biaya_admin: editableData.biaya_admin,
          biaya_packaging: editableData.biaya_packaging,
          biaya_transit: editableData.biaya_transit,
          total: total,
          isi_barang: selectedBooking.isi_barang || "",
          catatan: `Verified from agent booking ${selectedBooking.awb_no}`,
          buktimembayar: false,
          potongan: 0,
          status_pelunasan: 'outstanding',
          origin_branch: selectedBooking.origin_branch || branchOrigin
        }

        const { error: insertError } = await supabaseClient
          .from('manifest_cabang')
          .insert([manifestData])

        if (insertError) {
          setError("Gagal menyimpan ke manifest cabang: " + insertError.message)
          return
        }

        alert("Booking berhasil diverifikasi dan ditambahkan ke manifest cabang!")

      } else if (verifyAction === 'reject') {
        if (!rejectionReason.trim()) {
          setError("Alasan penolakan harus diisi")
          return
        }

        const { error: updateError } = await supabaseClient
          .from('manifest_booking')
          .update({
            status: 'rejected',
            verified_time: new Date().toISOString(),
            catatan: `DITOLAK: ${rejectionReason}`
          })
          .eq('id', selectedBooking.id)

        if (updateError) {
          setError("Gagal menolak booking: " + updateError.message)
          return
        }

        alert("Booking berhasil ditolak!")
      }

      handleCloseModal()
      refreshBookings() // Refresh data

    } catch (err) {
      setError("Terjadi kesalahan: " + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const { subTotal, total } = calculateTotal()

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          Verifikasi Booking Agent
        </h2>
        {/* QR Scanner and Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Masukkan AWB No..."
              value={scannedAWB}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScannedAWB(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleManualAWBSearch()}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              type="button"
              onClick={handleManualAWBSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/><path d="M15 15L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Cari
            </button>
          </div>
          <button
            type="button"
            onClick={showQRScanner ? closeQRScanner : () => setShowQRScanner(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2 ${
              showQRScanner 
                ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500" 
                : "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
            }`}
          >
            {showQRScanner ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="7" y="7" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
            )}
            {showQRScanner ? "Tutup QR Scanner" : "QR Scanner"}
          </button>
        </div>
      </div>

      {/* QR Scanner */}
      {showQRScanner && (
        <div className="mb-6">
          <QRScanner 
            onScan={handleQRScan}
            onClose={closeQRScanner}
            disableAutoUpdate={true}
          />
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Menampilkan {bookings.length} booking pending verifikasi
        </p>
        <button
          type="button"
          onClick={refreshBookings}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm flex items-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 11a7 7 0 1 0 2-5.29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Refresh
        </button>
      </div>
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          {/* Remove emoji, keep minimal */}
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Tidak ada booking pending
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Semua booking agent sudah diverifikasi
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">AWB Booking</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Waktu Input</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Agent</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Pengirim</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Penerima</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Tujuan</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">Coli/Kg</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">Total</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-mono text-sm">
                    {booking.awb_no}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">
                    {formatDate(booking.input_time)}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">
                    <div className="font-medium text-blue-600 dark:text-blue-400">{booking.agent_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{booking.agent_email}</div>
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">
                    {booking.nama_pengirim}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">
                    {booking.nama_penerima}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">
                    {booking.kota_tujuan}
                    {booking.kecamatan && <div className="text-gray-500">({booking.kecamatan})</div>}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-sm">
                    {booking.coli} / {booking.berat_kg}kg
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right font-semibold">
                    {formatCurrency(booking.total)}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleOpenVerifyModal(booking, 'verify')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                      >
                        Verifikasi
                      </button>
                      <button
                        onClick={() => handleOpenVerifyModal(booking, 'reject')}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                      >
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {verifyAction === 'verify' ? 'Verifikasi' : 'Tolak'} Booking: {selectedBooking.awb_no}
            </h3>

            {/* Agent Information */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Informasi Agent</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Nama Agent:</span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400">{selectedBooking.agent_name}</span>
                </div>
                <div>
                  <span className="font-medium">Email Agent:</span>
                  <span className="ml-2 text-blue-600 dark:text-blue-400">{selectedBooking.agent_email}</span>
                </div>
                <div>
                  <span className="font-medium">Waktu Input:</span>
                  <span className="ml-2">{formatDate(selectedBooking.input_time)}</span>
                </div>
                <div>
                  <span className="font-medium">Origin Branch:</span>
                  <span className="ml-2">{selectedBooking.origin_branch}</span>
                </div>
              </div>
            </div>

            {verifyAction === 'verify' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Jumlah Coli</label>
                    <input
                      type="number"
                      value={editableData.coli || 0}
                      onChange={(e) => setEditableData({...editableData, coli: parseInt(e.target.value) || 0})}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Berat (Kg)</label>
                    <input
                      type="number"
                      value={editableData.berat_kg || 0}
                      onChange={(e) => setEditableData({...editableData, berat_kg: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Harga per Kg</label>
                    <input
                      type="number"
                      value={editableData.harga_per_kg || 0}
                      onChange={(e) => setEditableData({...editableData, harga_per_kg: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sub Total</label>
                    <input
                      type="number"
                      value={subTotal}
                      className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-600"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Biaya Admin</label>
                    <input
                      type="number"
                      value={editableData.biaya_admin || 0}
                      onChange={(e) => setEditableData({...editableData, biaya_admin: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Biaya Packaging</label>
                    <input
                      type="number"
                      value={editableData.biaya_packaging || 0}
                      onChange={(e) => setEditableData({...editableData, biaya_packaging: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Biaya Transit</label>
                    <input
                      type="number"
                      value={editableData.biaya_transit || 0}
                      onChange={(e) => setEditableData({...editableData, biaya_transit: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-green-600 dark:text-green-400">Total Akhir</label>
                    <input
                      type="number"
                      value={total}
                      className="w-full border rounded px-3 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-semibold"
                      readOnly
                    />
                  </div>
                </div>

                {/* Display booking details */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded mt-4">
                  <h4 className="font-semibold mb-2">Detail Booking:</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Pengirim:</strong> {selectedBooking.nama_pengirim}</p>
                    <p><strong>Penerima:</strong> {selectedBooking.nama_penerima}</p>
                    <p><strong>Alamat:</strong> {selectedBooking.alamat_penerima}</p>
                    <p><strong>Tujuan:</strong> {selectedBooking.kota_tujuan} - {selectedBooking.kecamatan}</p>
                    <p><strong>Via:</strong> {selectedBooking.kirim_via}</p>
                    <p><strong>Pembayaran:</strong> {selectedBooking.metode_pembayaran}</p>
                    <p><strong>Isi Barang:</strong> {selectedBooking.isi_barang}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Booking:</strong> {selectedBooking.awb_no}<br />
                    <strong>Pengirim:</strong> {selectedBooking.nama_pengirim}<br />
                    <strong>Penerima:</strong> {selectedBooking.nama_penerima}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Alasan Penolakan *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700"
                    rows={4}
                    placeholder="Jelaskan alasan penolakan booking ini..."
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleProcessVerification}
                disabled={isProcessing || (verifyAction === 'reject' && !rejectionReason.trim())}
                className={`px-6 py-2 rounded text-white font-medium ${
                  verifyAction === 'verify' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {isProcessing ? "Memproses..." : (verifyAction === 'verify' ? "Verifikasi" : "Tolak")}
              </button>
              <button
                onClick={handleCloseModal}
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
