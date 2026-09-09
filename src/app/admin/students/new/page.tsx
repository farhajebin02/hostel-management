import { createStudent } from '../actions'
import { Button, Card, inputClass, labelClass } from '@/components/ui'

export default function NewStudentPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Add Student</h1>
      <Card className="mt-4">
        <form action={createStudent} className="flex flex-col gap-4">
          <label className={labelClass}>
            Phone number
            <input name="phone" type="tel" inputMode="numeric" placeholder="10-digit mobile number" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Starting password
            <input name="starting_password" type="text" placeholder="Tell this to the student" required minLength={6} className={inputClass} />
          </label>
          <label className={labelClass}>
            Full name
            <input name="full_name" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Room number
            <input name="room_number" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Permanent address
            <textarea name="permanent_address" required rows={2} className={inputClass} />
          </label>
          <label className={labelClass}>
            Personal contact number
            <input name="contact_personal" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Emergency contact number
            <input name="contact_emergency" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Profile photo
            <input type="file" name="photo" accept="image/*" className={inputClass} />
          </label>
          <Button type="submit" className="mt-2">Add student</Button>
        </form>
      </Card>
    </div>
  )
}
