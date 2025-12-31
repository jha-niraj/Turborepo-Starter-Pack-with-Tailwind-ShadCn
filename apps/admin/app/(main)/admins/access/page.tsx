"use client"

import { useEffect, useState } from "react"
import {
	getAdminUsers, updateAdminPermissions, updateAdminStatus
} from "@/actions/admin.action"
import {
	Shield, Settings, Loader2, Check, X
} from "lucide-react"
import { toast } from "@repo/ui/components/ui/sonner"

const MODULE_KEYS = [
	"dashboard", "users", "credits", "projects", "mocks", "assessments", "challenges", "communities", "feedback", "analytics", "admin_management", "system"
] as const
const LEVELS = ["read", "write", "delete", "full"] as const

type Level = typeof LEVELS[number]

type AdminRow = {
	id: string
	user: { id: string; name: string | null; email: string | null }
	adminRole: string
	status: string
	permissions: Record<string, Level[]>
}

export default function AdminAccessPage() {
	const [admins, setAdmins] = useState<AdminRow[]>([])
	const [loading, setLoading] = useState(true)
	const [savingId, setSavingId] = useState<string | null>(null)

	useEffect(() => { load() }, [])

	async function load() {
		setLoading(true)
		const res = await getAdminUsers()
		setLoading(false)
		if (!res.success) {
			toast.error(res.error || 'Failed to fetch admins')
			return
		}
		// Normalise shape
		const rows = (res.data || []).map((a: AdminRow) => ({
			id: a.id,
			user: a.user,
			adminRole: a.adminRole,
			status: a.status,
			permissions: a.permissions || {}
		}))
		setAdmins(rows)
	}

	function togglePerm(idx: number, moduleKey: string, level: Level) {
		setAdmins(prev => prev.map((a, i) => {
			if (i !== idx) return a
			const current = new Set(a.permissions[moduleKey] || [])
			if (current.has(level)) current.delete(level); else current.add(level)
			return { ...a, permissions: { ...a.permissions, [moduleKey]: Array.from(current) as Level[] } }
		}))
	}

	async function save(idx: number) {
		const row = admins[idx]
		if (!row) return
		setSavingId(row.id)
		const res = await updateAdminPermissions(row.id, row.permissions)
		setSavingId(null)
		if (res.success) { toast.success('Permissions updated') } else { toast.error(res.error || 'Failed to update') }
	}

	async function setStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
		setSavingId(id)
		const res = await updateAdminStatus(id, status)
		setSavingId(null)
		if (res.success) { toast.success('Status updated'); load() } else { toast.error(res.error || 'Failed to update status') }
	}

	return (
		<div className="p-6 lg:p-8 max-w-7xl mx-auto">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
					<Shield className="w-7 h-7" /> Access Control
				</h1>
				<p className="text-neutral-500 dark:text-neutral-400">Edit admin permissions across modules.</p>
			</div>
			{
				loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
					</div>
				) : (
					<div className="space-y-6">
						{
							admins.map((a, idx) => (
								<div key={a.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
									<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center font-semibold">
												{(a.user?.name || a.user?.email || 'A').charAt(0).toUpperCase()}
											</div>
											<div>
												<div className="font-semibold text-neutral-900 dark:text-white">{a.user?.name || 'Unknown'}</div>
												<div className="text-sm text-neutral-500">{a.user?.email}</div>
												<div className="text-xs mt-1 inline-flex px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">{a.adminRole} • {a.status}</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button onClick={() => setStatus(a.id, 'ACTIVE')} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white">Activate</button>
											<button onClick={() => setStatus(a.id, 'INACTIVE')} className="px-3 py-1.5 text-xs rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">Inactive</button>
											<button onClick={() => setStatus(a.id, 'SUSPENDED')} className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white">Suspend</button>
										</div>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead>
												<tr className="bg-neutral-50 dark:bg-neutral-800/50">
													<th className="text-left p-3">Module</th>
													{
														LEVELS.map(l => (
															<th key={l} className="text-center p-3 capitalize">{l}</th>
														))
													}
												</tr>
											</thead>
											<tbody>
												{
													MODULE_KEYS.map((key) => (
														<tr key={key} className="border-t border-neutral-200 dark:border-neutral-800">
															<td className="p-3 capitalize text-neutral-800 dark:text-neutral-200">{key.replace('_', ' ')}</td>
															{
																LEVELS.map((lvl) => {
																	const checked = (a.permissions[key] || []).includes(lvl as Level)
																	return (
																		<td key={lvl} className="p-3 text-center">
																			<button
																				onClick={() => togglePerm(idx, key, lvl as Level)}
																				className={`inline-flex items-center justify-center w-8 h-8 rounded-md border ${checked ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-400'}`}
																				aria-pressed={checked}
																			>
																				{checked ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
																			</button>
																		</td>
																	)
																})
															}
														</tr>
													))
												}
											</tbody>
										</table>
									</div>
									<div className="mt-4 flex justify-end">
										<button
											onClick={() => save(idx)}
											disabled={savingId === a.id}
											className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-red-500 to-orange-500 disabled:opacity-50"
										>
											{savingId === a.id ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving</>) : (<><Settings className="w-4 h-4" /> Save Changes</>)}
										</button>
									</div>
								</div>
							))
						}
					</div>
				)
			}
		</div>
	)
}