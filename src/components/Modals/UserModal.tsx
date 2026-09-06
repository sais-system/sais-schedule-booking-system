import React, { useState } from 'react';
import { User, Inspector, UserRole, UserStatus } from '../../types';
import { Icons } from '../Icons';

interface UserModalProps {
  user?: User | null;
  isNew?: boolean;
  inspectors: Inspector[];
  existingUsers: User[];
  onClose: () => void;
  onSave: (userData: User) => void;
  setAlertMsg: (msg: string | null) => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  user,
  isNew,
  inspectors,
  existingUsers,
  onClose,
  onSave,
  setAlertMsg,
}) => {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState(user?.password || 'password123');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [position, setPosition] = useState(user?.position || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'user');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'approved');
  const [inspectorMappedName, setInspectorMappedName] = useState(user?.inspector_mapped_name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setAlertMsg('กรุณากรอก Username');
      return;
    }
    if (isNew && existingUsers.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      setAlertMsg('Username นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น');
      return;
    }
    if (!fullName.trim()) {
      setAlertMsg('กรุณากรอกชื่อ-นามสกุลจริง');
      return;
    }

    const userData: User = {
      username: username.trim(),
      password,
      full_name: fullName.trim(),
      department: department.trim(),
      position: position.trim(),
      phone: phone.trim(),
      role,
      status,
      inspector_mapped_name: role === 'inspector' ? inspectorMappedName : '',
      created_at: user?.created_at || new Date().toISOString(),
    };

    onSave(userData);
  };

  return (
    <div className="modal-card p-6 w-full max-w-md bg-white rounded-3xl shadow-2xl animate-pop relative max-h-[90vh] overflow-y-auto custom-scrollbar">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
      >
        <Icons.X />
      </button>

      <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          {isNew ? <Icons.UserPlus /> : <Icons.User />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 leading-tight">
            {isNew ? 'สร้างบัญชีผู้ใช้งานใหม่' : 'แก้ไขข้อมูลผู้ใช้งาน'}
          </h3>
          <span className="text-[11px] text-slate-400">กำหนดสิทธิ์และการเข้าถึงระบบ</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {isNew ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="เช่น user01"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none focus:border-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Username:</span>
            <span className="font-bold text-slate-800">{username}</span>
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-slate-600 block mb-1">
            ชื่อ-นามสกุล (จริง) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="ชื่อ นามสกุล"
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">แผนก (Department)</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="NI, MOD, FQE"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">ตำแหน่ง (Position)</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="PE, PM, Inspector"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-600 block mb-1">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={10}
            placeholder="08XXXXXXXX"
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">ระดับสิทธิ์ (Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-bold outline-none"
            >
              <option value="user">User ทั่วไป (จองคิว)</option>
              <option value="inspector">Inspector (ผู้ตรวจ)</option>
              <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              <option value="viewer">Viewer (เข้าดูอย่างเดียว)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">สถานะ (Status)</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-bold outline-none"
            >
              <option value="approved">✅ อนุมัติ (Approved)</option>
              <option value="pending">⏳ รอตรวจสอบ (Pending)</option>
              <option value="blocked">⛔ ระงับสิทธิ์ (Blocked)</option>
            </select>
          </div>
        </div>

        {role === 'inspector' && (
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-1">
            <label className="text-xs font-bold text-amber-900 block">🔗 ผูกชื่อในตาราง (Mapping Name)</label>
            <select
              value={inspectorMappedName}
              onChange={(e) => setInspectorMappedName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white font-bold text-slate-700 outline-none"
            >
              <option value="">-- ไม่ได้ผูกชื่อ --</option>
              {inspectors.map((ins) => (
                <option key={ins.name} value={ins.name}>
                  {ins.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-amber-700">
              เมื่อผูกชื่อแล้ว คิวงานในตารางจะเชื่อมไปยังหน้า <b>"งานฉัน"</b> ของ Inspector ท่านนี้โดยอัตโนมัติ
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md active:scale-98 transition-all text-xs flex items-center justify-center gap-1.5 mt-4"
        >
          <Icons.Check /> {isNew ? 'ยืนยันสร้างผู้ใช้งาน' : 'บันทึกการแก้ไข'}
        </button>
      </form>
    </div>
  );
};
