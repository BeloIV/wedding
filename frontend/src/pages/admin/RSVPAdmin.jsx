import { useState, useEffect } from 'react'
import { Mail, Check, X } from 'lucide-react'
import api from '../../api/axios'

const DIETARY_LABELS = {
  none: 'Bez obmedzení', vegetarian: 'Vegetarián', vegan: 'Vegán',
  gluten_free: 'Bezlepkovo', other: 'Iné',
}

export default function RSVPAdmin() {
  const [responses, setResponses] = useState([])

  useEffect(() => {
    api.get('/api/rsvp-responses/').then(r => setResponses(r.data.results || r.data))
  }, [])

  const attending = responses.filter(r => r.attending).length
  const notAttending = responses.filter(r => !r.attending).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">RSVP Inbox</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {responses.length} odpovedí · <span className="text-green-600">{attending} príde</span> · <span className="text-gray-400">{notAttending} nepríde</span>
        </p>
      </div>

      {responses.length === 0 ? (
        <div className="admin-card text-center py-12">
          <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Žiadne odpovede zatiaľ.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {responses.map(r => (
            <div key={r.id} className="admin-card flex items-start gap-4">
              <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.attending ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {r.attending ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-gray-900">{r.guest_name}</p>
                  {r.email && <p className="text-sm text-gray-400">{r.email}</p>}
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                    {new Date(r.submitted_at).toLocaleDateString('sk-SK')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`badge ${r.attending ? 'badge-green' : 'badge-gray'}`}>
                    {r.attending ? 'Príde' : 'Nepríde'}
                  </span>
                  {r.attending && r.dietary !== 'none' && (
                    <span className="badge badge-blue">{DIETARY_LABELS[r.dietary]}</span>
                  )}
                </div>
                {r.message && (
                  <p className="text-sm text-gray-500 mt-2 italic">"{r.message}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
