import React, { useState } from 'react'
import { Star, ThumbsUp, MessageSquare } from 'lucide-react'
import { CPA_REVIEWS, CPA_PROFILE } from '../../data/cpaData'

const StarRating = ({ rating, size = 14 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={size} className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
    ))}
  </div>
)

const TABS = ['All', '5 Stars', '4 Stars', 'Replied', 'Pending Reply']

export default function CPAReviews() {
  const [tab, setTab] = useState('All')
  const [reviews, setReviews] = useState(CPA_REVIEWS)
  const [replyInputs, setReplyInputs] = useState({})
  const [openReplyId, setOpenReplyId] = useState(null)

  const filtered = reviews.filter(r => {
    if (tab === '5 Stars') return r.rating === 5
    if (tab === '4 Stars') return r.rating === 4
    if (tab === 'Replied') return r.replied
    if (tab === 'Pending Reply') return !r.replied
    return true
  })

  const submitReply = (id) => {
    const text = replyInputs[id]?.trim()
    if (!text) return
    setReviews(prev => prev.map(r => r.id === id ? { ...r, replied: true, reply: text } : r))
    setOpenReplyId(null)
    setReplyInputs(prev => ({ ...prev, [id]: '' }))
  }

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
  const starCounts = [5, 4, 3, 2, 1].map(s => ({ star: s, count: reviews.filter(r => r.rating === s).length }))

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1B3A5C]">Reviews & Ratings</h1>
        <p className="text-gray-500 text-sm mt-0.5">{reviews.length} reviews from clients</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="text-center">
            <p className="text-5xl font-bold text-[#1B3A5C]">{avgRating}</p>
            <StarRating rating={Math.round(parseFloat(avgRating))} size={18} />
            <p className="text-sm text-gray-400 mt-1">{reviews.length} reviews</p>
          </div>
          <div className="flex-1 space-y-2">
            {starCounts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-gray-500 w-12">
                  <Star size={12} className="text-amber-400 fill-amber-400" /> {star}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-4">{count}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[#2E75B6]">{reviews.filter(r => r.replied).length}</p>
              <p className="text-xs text-blue-500">Replied</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-600">{reviews.filter(r => !r.replied).length}</p>
              <p className="text-xs text-amber-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-[#1B3A5C] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {filtered.map(review => (
          <div key={review.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {review.clientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-[#1B3A5C]">{review.clientName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-gray-400">{review.date}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{review.service}</span>
                  </div>
                </div>
              </div>
              {review.replied && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">Replied</span>
              )}
            </div>
            <p className="text-gray-700 text-sm mt-3 leading-relaxed">{review.text}</p>

            {review.replied && review.reply && (
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-500 font-medium mb-1">Your Reply</p>
                <p className="text-sm text-blue-900">{review.reply}</p>
              </div>
            )}

            {!review.replied && (
              <div className="mt-3">
                {openReplyId === review.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyInputs[review.id] || ''}
                      onChange={e => setReplyInputs(prev => ({ ...prev, [review.id]: e.target.value }))}
                      placeholder="Write your reply..."
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => submitReply(review.id)}
                        className="px-4 py-1.5 bg-[#2E75B6] text-white rounded-lg text-sm font-medium hover:bg-[#1B3A5C] transition-colors">
                        Submit Reply
                      </button>
                      <button onClick={() => setOpenReplyId(null)}
                        className="px-4 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setOpenReplyId(review.id)}
                    className="flex items-center gap-1.5 text-sm text-[#2E75B6] hover:text-[#1B3A5C] font-medium">
                    <MessageSquare size={14} /> Reply to this review
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No reviews in this category.</div>
        )}
      </div>
    </div>
  )
}
