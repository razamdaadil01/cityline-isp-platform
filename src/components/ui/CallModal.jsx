import { useState, useEffect } from 'react'
import { PhoneCall } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

export default function CallModal({ isOpen, onClose, customerName, phoneNumber, onCallInitiated }) {
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!isOpen) setConnecting(false)
  }, [isOpen])

  function handleCallNow() {
    setConnecting(true)
    setTimeout(() => {
      setConnecting(false)
      onCallInitiated?.({ number: phoneNumber, name: customerName })
      onClose()
    }, 2000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={connecting ? undefined : onClose}
      title="Initiate Call"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={connecting}>Cancel</Button>
          <button
            onClick={handleCallNow}
            disabled={connecting}
            className="inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-4 py-2 text-sm rounded-lg"
          >
            <PhoneCall size={14} />
            {connecting ? 'Connecting...' : 'Call Now'}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center py-4 gap-5">
        {/* Animated indicator */}
        <div className="relative flex items-center justify-center w-20 h-20">
          {connecting && (
            <>
              <div className="absolute inset-0 rounded-full bg-emerald-200 animate-ping opacity-60" />
              <div className="absolute inset-[-8px] rounded-full bg-emerald-100 animate-ping opacity-40 [animation-delay:400ms]" />
            </>
          )}
          <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${connecting ? 'bg-emerald-500' : 'bg-emerald-50 border-2 border-emerald-200'}`}>
            <PhoneCall size={28} className={`transition-colors duration-300 ${connecting ? 'text-white animate-bounce' : 'text-emerald-600'}`} />
          </div>
        </div>

        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">{customerName}</p>
          <p className="text-sm font-mono text-gray-500 mt-1">{phoneNumber}</p>
        </div>

        <p className="text-xs text-gray-400">
          {connecting ? 'Connecting via IVR system...' : 'Calling via IVR system...'}
        </p>
      </div>
    </Modal>
  )
}
