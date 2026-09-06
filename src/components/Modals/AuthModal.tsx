import React, { useState } from 'react';
import { User } from '../../types';
import { Icons } from '../Icons';

interface AuthModalProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
  onResetPassword: (fullName: string, phone: string, newPass: string) => boolean;
  onClose?: () => void;
  setAlertMsg: (msg: string | null) => void;
  setSuccessModal: (msg: string | React.ReactNode | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  users,
  onLogin,
  onRegister,
  onResetPassword,
  onClose,
  setAlertMsg,
  setSuccessModal,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      const found = users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
      );

      if (!found) {
        setAlertMsg('Username หรือรหัสผ่านไม่ถูกต้อง');
        return;
      }
      if (found.status === 'blocked') {
        setAlertMsg('บัญชีของคุณถูกระงับสิทธิ์การใช้งาน กรุณาติดต่อ Admin');
        return;
      }
      if (found.status === 'pending') {
        setAlertMsg('บัญชีของคุณกำลังรอการอนุมัติสิทธิ์จาก Admin');
        return;
      }

      onLogin(found);
      setSuccessModal(`ยินดีต้อนรับคุณ ${found.full_name || found.username}`);
      if (onClose) onClose();
    } else if (mode === 'register') {
      if (password !== confirmPassword) {
        setAlertMsg('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
      if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
        setAlertMsg('Username นี้ถูกใช้งานแล้ว โปรดเลือกชื่ออื่น');
        return;
      }
      if (!fullName.trim() || !phone.trim()) {
        setAlertMsg('กรุณากรอกชื่อ-นามสกุลจริงและเบอร์โทรศัพท์');
        return;
      }

      const newUser: User = {
        username: username.trim(),
        password,
        full_name: fullName.trim(),
        department: department.trim(),
        position: position.trim(),
        phone: phone.trim(),
        role: 'user',
        status: 'approved', // Auto-approved or pending based on system setup
        created_at: new Date().toISOString(),
      };

      onRegister(newUser);
      setSuccessModal('สมัครสมาชิกเรียบร้อย เข้าใช้งานได้ทันที');
      onLogin(newUser);
      if (onClose) onClose();
    } else if (mode === 'forgot') {
      if (password !== confirmPassword) {
        setAlertMsg('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
      const success = onResetPassword(fullName.trim(), phone.trim(), password);
      if (success) {
        setSuccessModal('รีเซ็ตรหัสผ่านใหม่สำเร็จ สามารถเข้าสู่ระบบได้ทันที');
        setMode('login');
      } else {
        setAlertMsg('ไม่พบข้อมูลผู้ใช้งานที่ตรงกับชื่อและเบอร์โทรนี้');
      }
    }
  };

  return (
    <div className="backdrop z-[250] p-4">
      <div className="modal-card p-6 relative overflow-hidden flex flex-col max-h-[90vh] bg-white rounded-3xl shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-red-600 z-10"></div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full z-10 transition-colors"
          >
            <Icons.X />
          </button>
        )}

        <div className="text-center mb-5 pt-3 flex-shrink-0">
          <div className="mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">SAIS</h1>
            <h2 className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Schedule Booking System</h2>
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {showHelp
              ? 'คู่มือการเข้าสู่ระบบ'
              : mode === 'forgot'
              ? 'รีเซ็ตรหัสผ่าน'
              : mode === 'register'
              ? 'สมัครสมาชิกใหม่'
              : 'เข้าสู่ระบบ SAIS'}
          </h3>
        </div>

        {showHelp ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3.5 pb-2 text-xs text-slate-700">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
              <h4 className="font-bold text-blue-900 text-sm">💡 บัญชีทดสอบที่มีในระบบ</h4>
              <p>คุณสามารถเลือกล็อกอินด้วยบัญชีที่สร้างไว้แล้วได้ทันที:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <b>Admin (ผู้ดูแล):</b> Username: <span className="text-red-600 font-bold">jirapong</span> หรือ{' '}
                  <span className="text-red-600 font-bold">admin</span> / รหัส: <span className="font-bold">password123</span>
                </li>
                <li>
                  <b>Inspector (ผู้ตรวจ):</b> Username: <span className="text-indigo-600 font-bold">somsak</span> / รหัส:{' '}
                  <span className="font-bold">password123</span>
                </li>
                <li>
                  <b>User (ผู้จอง):</b> Username: <span className="text-blue-600 font-bold">somchai</span> / รหัส:{' '}
                  <span className="font-bold">password123</span>
                </li>
                <li>
                  <b>Viewer (ช่างหน้างาน):</b> Username: <span className="text-emerald-600 font-bold">viewer</span> / รหัส:{' '}
                  <span className="font-bold">viewer123</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl text-xs"
            >
              กลับสู่หน้าล็อกอิน
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3.5 pb-2">
            {mode === 'forgot' && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
                กรุณาระบุ <b>ชื่อ-นามสกุล</b> และ <b>เบอร์โทรศัพท์</b> ให้ตรงกับตอนลงทะเบียน เพื่อตั้งรหัสผ่านใหม่
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    ชื่อ-นามสกุล (จริง) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ชื่อ นามสกุล"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">แผนก (NI, MOD, FQE)</label>
                    <input
                      type="text"
                      required
                      placeholder="NI"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      required
                      placeholder="PE, PM"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="08XXXXXXXX"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none"
                  />
                </div>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">ชื่อ-นามสกุล ที่ลงทะเบียนไว้</label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุชื่อ นามสกุล"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">เบอร์โทรศัพท์ ที่ลงทะเบียนไว้</label>
                  <input
                    type="tel"
                    required
                    placeholder="08XXXXXXXX"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none"
                  />
                </div>
              </>
            )}

            {mode !== 'forgot' && (
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น jirapong, somchai"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none focus:border-red-500"
                />
              </div>
            )}

            <div className="relative">
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                {mode === 'forgot' ? 'รหัสผ่านใหม่' : 'Password'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-2.5 pr-10 rounded-xl border border-slate-300 font-bold outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[26px] text-slate-400 p-1 hover:text-slate-600"
              >
                {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>

            {(mode === 'register' || mode === 'forgot') && (
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="พิมพ์ยืนยันรหัสผ่านอีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none focus:border-red-500"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md text-xs active:scale-98 transition-all mt-3"
            >
              {mode === 'forgot' ? 'ยืนยันกู้คืนบัญชี' : mode === 'register' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ (LOGIN)'}
            </button>

            <div className="flex flex-col gap-2 pt-2 text-center">
              {mode === 'login' ? (
                <>
                  <div className="flex justify-between items-center text-[11px] font-bold px-1">
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-blue-600 hover:underline"
                    >
                      ลงทะเบียนผู้ใช้ใหม่
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-slate-500 hover:underline"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    className="text-[11px] text-emerald-600 font-bold hover:underline mt-1"
                  >
                    📖 ดูบัญชีทดสอบในระบบ (Admin / Inspector)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-bold text-slate-500 hover:underline"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
