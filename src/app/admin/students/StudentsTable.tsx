'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export type StudentRow = {
  id: string
  fullName: string | null
  roomNumber: string | null
  feeStatus: string
  photoUrl: string | null
}

type SortKey = 'fullName' | 'roomNumber' | 'feeStatus'

export function StudentsTable({ students }: { students: StudentRow[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('fullName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = q
      ? students.filter(
          (s) =>
            (s.fullName ?? '').toLowerCase().includes(q) ||
            (s.roomNumber ?? '').toLowerCase().includes(q)
        )
      : students

    return [...matched].sort((a, b) => {
      const av = (a[sortKey] ?? '').toString().toLowerCase()
      const bv = (b[sortKey] ?? '').toString().toLowerCase()
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [students, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return null
    return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or room..."
        className="mb-3 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">Photo</th>
              <th
                className="cursor-pointer select-none px-4 py-2.5 font-medium hover:text-slate-700"
                onClick={() => toggleSort('fullName')}
              >
                Name{arrow('fullName')}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-2.5 font-medium hover:text-slate-700"
                onClick={() => toggleSort('roomNumber')}
              >
                Room{arrow('roomNumber')}
              </th>
              <th
                className="cursor-pointer select-none px-4 py-2.5 font-medium hover:text-slate-700"
                onClick={() => toggleSort('feeStatus')}
              >
                Fee status{arrow('feeStatus')}
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  {s.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                      {s.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{s.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{s.roomNumber}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      s.feeStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {s.feeStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/students/${s.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No students match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
