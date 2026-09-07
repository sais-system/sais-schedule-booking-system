import React, { useState } from 'react';
import { User } from '../../types';
import { Icons } from '../Icons';

interface AuthModalProps {
  users: User[];
  onLogin: (user: User, rememberMe?: boolean) => void;
  onRegister: (newUser: User) => void;
  onResetPassword: (fullName: string, phone: string, newPass: string) => boolean;
  onClose?: () => void;
  setAlertMsg: (msg: string | null) => void;
  setSuccessModal: (msg: string | React.ReactNode | null) => void;
  isGate?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  users,
  onLogin,
  onRegister,
  onResetPassword,
  onClose,
  setAlertMsg,
  setSuccessModal,
  isGate = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
        setAlertMsg('⛔ บัญชีของคุณถูกระงับสิทธิ์การใช้งาน กรุณาติดต่อ Admin');
        return;
      }
      if (found.status === 'pending') {
        setAlertMsg('⏳ บัญชีของคุณอยู่ระหว่าง "รอ Admin อนุมัติสิทธิ์" (Pending)\nกรุณารอผู้ดูแลระบบตรวจสอบและอนุมัติการใช้งานก่อนเข้าสู่ระบบครับ');
        return;
      }

      onLogin(found, rememberMe);
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
        status: 'pending', // Set to pending: requires Admin approval
        created_at: new Date().toISOString(),
      };

      onRegister(newUser);
      // Requirement: Do NOT auto-login after registering!
      setMode('login');
      setUsername(newUser.username);
      setPassword('');
      setConfirmPassword('');
      setSuccessModal(
        '✅ สมัครสมาชิกเรียบร้อยแล้ว!\nสถานะบัญชีคือ "รอ Admin อนุมัติ" (Pending)\nกรุณารอผู้ดูแลระบบอนุมัติบัญชีก่อน จึงจะสามารถเข้าสู่ระบบได้ครับ'
      );
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

  const cardContent = (
    <div className={`w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 relative ${isGate ? 'my-auto' : 'max-h-[92vh]'}`}>
      <div className="h-2 bg-gradient-to-r from-red-600 via-blue-600 to-emerald-600 shrink-0"></div>
      
      {onClose && !isGate && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full z-10 transition-colors"
          title="ปิด"
        >
          <Icons.X size={18} />
        </button>
      )}

      {/* Header Section */}
      <div className="p-5 sm:p-6 pb-3 text-center shrink-0">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white font-black text-xl flex items-center justify-center shadow-md">
            S
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">SAIS</h1>
            <span className="text-[10px] font-bold text-red-600 tracking-wider uppercase">
              Schedule Booking System
            </span>
          </div>
        </div>

        {isGate && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-[11px] font-bold mt-1">
            <Icons.Shield size={12} className="text-blue-600" />
            <span>ระบบรักษาความปลอดภัยระดับองค์กร (Enterprise Access Gate)</span>
          </div>
        )}

        <div className="mt-2 text-xs text-slate-600">
          {mode === 'login'
            ? 'ต้องเข้าสู่ระบบก่อน จึงจะสามารถดูตารางคิวงาน แก้ไข หรือจัดการข้อมูลได้'
            : mode === 'register'
            ? 'กรอกข้อมูลเพื่อลงทะเบียนผู้ใช้งานระบบ SAIS'
            : 'ระบุข้อมูลยืนยันตัวตนเพื่อตั้งรหัสผ่านใหม่'}
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl mt-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-1.5 rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-1.5 rounded-lg transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            ลงทะเบียน
          </button>
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className={`py-1.5 rounded-lg transition-all ${mode === 'forgot' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            ลืมรหัสผ่าน
          </button>
        </div>
      </div>

      {/* Form Body */}
      <div className="p-5 sm:p-6 pt-0 flex-1 overflow-y-auto custom-scrollbar -webkit-overflow-scrolling-touch pb-6">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'forgot' && (
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
              กรุณาระบุ <b>ชื่อ-นามสกุล</b> และ <b>เบอร์โทรศัพท์</b> ให้ตรงกับตอนลงทะเบียน เพื่อตั้งรหัสผ่านใหม่
            </div>
          )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    ชื่อ-นามสกุล (จริง) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">แผนก</label>
                    <input
                      type="text"
                      required
                      placeholder="NI, MOD, FQE"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      required
                      placeholder="PE, PM, Tech"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="08XXXXXXXX"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">ชื่อ-นามสกุล ที่ลงทะเบียนไว้</label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุชื่อ นามสกุล"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">เบอร์โทรศัพท์ ที่ลงทะเบียนไว้</label>
                  <input
                    type="tel"
                    required
                    placeholder="08XXXXXXXX"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </>
            )}

            {mode !== 'forgot' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น jirapong, somchai"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            )}

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {mode === 'forgot' ? 'รหัสผ่านใหม่' : 'Password'} <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm p-3 pr-11 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 placeholder:text-slate-400 placeholder:font-normal"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-slate-400 p-1 hover:text-slate-600"
              >
                {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
              </button>
            </div>

            {/* Remember Me Checkbox (24 Hours Persistence in LocalStorage) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between py-1 px-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-800 font-semibold hover:text-slate-950">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 accent-red-600 cursor-pointer"
                  />
                  <span>จดจำการเข้าสู่ระบบ (จำไว้ 24 ชม.)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
            )}

            {(mode === 'register' || mode === 'forgot') && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="พิมพ์ยืนยันรหัสผ่านอีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 font-bold text-slate-950 text-black bg-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold rounded-xl shadow-md text-sm transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              <Icons.Lock size={16} />
              {mode === 'forgot' ? 'ยืนยันกู้คืนบัญชี' : mode === 'register' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ (Sign In)'}
            </button>
          </form>
      </div>

      {/* Card Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-500 flex items-center justify-between px-5 shrink-0">
        <span className="flex items-center gap-1 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          Firebase Online
        </span>
        <span>SAIS Enterprise Pro Max</span>
      </div>
    </div>
  );

  if (isGate) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-between items-center p-3 sm:p-6 text-slate-100 overflow-y-auto">
        <div className="w-full max-w-md flex justify-between items-center py-2 text-xs text-slate-400">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Icons.Shield size={14} className="text-red-500" />
            Schindler SAIS Thailand
          </span>
          <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full border border-slate-700">
            TLS 1.3 256-Bit SSL
          </span>
        </div>

        {cardContent}

        <div className="w-full max-w-md text-center text-[10px] text-slate-500 py-3 space-y-0.5">
          <div>มาตรฐานความปลอดภัย ISO/IEC 27001 & ข้อมูลเข้ารหัสบน Google Cloud Platform</div>
          <div>© {new Date().getFullYear()} Schindler Elevator (Thailand) Ltd. All Rights Reserved.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop z-[250] p-4 flex items-center justify-center">
      {cardContent}
    </div>
  );
};
