import { createStudent } from '../actions'

export default function NewStudentPage() {
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Add Student</h1>
      <form action={createStudent} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="full_name" placeholder="Full name" required className="rounded border p-2" />
        <input name="room_number" placeholder="Room number" required className="rounded border p-2" />
        <textarea name="permanent_address" placeholder="Permanent address" required className="rounded border p-2" />
        <input name="contact_personal" placeholder="Personal contact number" required className="rounded border p-2" />
        <input name="contact_emergency" placeholder="Emergency contact number" required className="rounded border p-2" />
        <label className="flex flex-col gap-1 text-sm">
          Profile photo
          <input type="file" name="photo" accept="image/*" className="rounded border p-2" />
        </label>
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">Add student</button>
      </form>
    </div>
  )
}
