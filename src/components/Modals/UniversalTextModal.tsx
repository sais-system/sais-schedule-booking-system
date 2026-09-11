import React, { useState, useMemo } from 'react';
import { Icons } from '../Icons';

export interface TextDefinition {
  id: string;
  category:
    | 'header_nav'
    | 'calendar'
    | 'booking'
    | 'detail'
    | 'sais_oil'
    | 'day_action'
    | 'admin'
    | 'auth'
    | 'placeholders'
    | 'status_alert'
    | 'custom';
  label: string;
  defaultText: string;
  multiline?: boolean;
}

export const APP_TEXT_DEFINITIONS: TextDefinition[] = [
  // ==========================================
  // 1. HEADER & NAVIGATION
  // ==========================================
  { id: 'site_title', category: 'header_nav', label: 'ชื่อระบบที่แถบด้านบน (Site Title)', defaultText: 'SAIS SCHEDULE BOOKING & LIFT INSPECTION' },
  { id: 'nav_calendar', category: 'header_nav', label: 'เมนูล่าง: ปฏิทินงานตรวจ', defaultText: 'ปฏิทินงานตรวจ' },
  { id: 'nav_search', category: 'header_nav', label: 'เมนูล่าง: ค้นหางานตรวจ', defaultText: 'ค้นหางาน' },
  { id: 'nav_stats', category: 'header_nav', label: 'เมนูล่าง: สถิติงานตรวจ', defaultText: 'สถิติงาน' },
  { id: 'nav_sais_db', category: 'header_nav', label: 'เมนูล่าง: SAIS Databases', defaultText: 'SAIS DB' },
  { id: 'nav_oil', category: 'header_nav', label: 'เมนูล่าง: Tracking OIL', defaultText: 'OIL' },
  { id: 'nav_admin', category: 'header_nav', label: 'เมนูล่าง: ผู้ดูแลระบบ', defaultText: 'ผู้ดูแล' },
  { id: 'nav_logout', category: 'header_nav', label: 'เมนู: ออกจากระบบ', defaultText: 'ออกจากระบบ' },
  { id: 'btn_today', category: 'header_nav', label: 'ปุ่ม: วันนี้', defaultText: 'วันนี้' },
  { id: 'btn_tutorial', category: 'header_nav', label: 'ปุ่ม: คู่มือใช้งาน', defaultText: 'คู่มือ' },
  { id: 'btn_live_edit_on', category: 'header_nav', label: 'ปุ่มแถบหัว: โหมดปากกาเปิดอยู่', defaultText: 'โหมดปากกา: เปิดอยู่' },
  { id: 'btn_live_edit_off', category: 'header_nav', label: 'ปุ่มแถบหัว: โหมดปากกาปิดอยู่', defaultText: 'ปากกาแก้ไขสด' },
  { id: 'firebase_status_online', category: 'header_nav', label: 'สถานะระบบ Cloud: Firebase Online', defaultText: 'Firebase Online' },

  // ==========================================
  // 2. CALENDAR & TABLE VIEW
  // ==========================================
  { id: 'tbl_date_col', category: 'calendar', label: 'หัวตาราง: วันที่', defaultText: 'วันที่' },
  { id: 'tbl_all_jobs', category: 'calendar', label: 'หัวตาราง: งานทั้งหมด', defaultText: 'งานทั้งหมด' },
  { id: 'tbl_sunday', category: 'calendar', label: 'ชื่อวัน: อาทิตย์', defaultText: 'อาทิตย์' },
  { id: 'tbl_monday', category: 'calendar', label: 'ชื่อวัน: จันทร์', defaultText: 'จันทร์' },
  { id: 'tbl_tuesday', category: 'calendar', label: 'ชื่อวัน: อังคาร', defaultText: 'อังคาร' },
  { id: 'tbl_wednesday', category: 'calendar', label: 'ชื่อวัน: พุธ', defaultText: 'พุธ' },
  { id: 'tbl_thursday', category: 'calendar', label: 'ชื่อวัน: พฤหัสบดี', defaultText: 'พฤหัสบดี' },
  { id: 'tbl_friday', category: 'calendar', label: 'ชื่อวัน: ศุกร์', defaultText: 'ศุกร์' },
  { id: 'tbl_saturday', category: 'calendar', label: 'ชื่อวัน: เสาร์', defaultText: 'เสาร์' },
  { id: 'tbl_today_badge', category: 'calendar', label: 'ป้ายกำกับ: วันนี้', defaultText: 'วันนี้' },
  { id: 'tbl_no_jobs', category: 'calendar', label: 'ข้อความ: ไม่มีคิวงานในวันนี้', defaultText: 'ไม่มีคิวงาน' },
  { id: 'tbl_drag_hint', category: 'calendar', label: 'คำแนะนำการลากย้ายคิวงาน', defaultText: 'ลากการ์ดเพื่อย้ายวันหรือสลับผู้ตรวจ' },
  { id: 'tbl_filter_location', category: 'calendar', label: 'ตัวกรอง: พื้นที่', defaultText: 'ทุกพื้นที่' },
  { id: 'tbl_filter_inspector', category: 'calendar', label: 'ตัวกรอง: ผู้ตรวจ', defaultText: 'ทุกผู้ตรวจ' },
  { id: 'tbl_filter_product_line', category: 'calendar', label: 'ตัวกรอง: Product Line', defaultText: 'Product Line (All)' },

  // ==========================================
  // 3. BOOKING MODAL (หน้าต่างจองคิวตรวจ SAIS)
  // ==========================================
  { id: 'bk_title_modal', category: 'booking', label: 'หน้าต่างจองคิว: หัวข้อหลัก', defaultText: 'จองคิวงานตรวจ SAIS' },
  { id: 'bk_btn_guide', category: 'booking', label: 'หน้าต่างจองคิว: ปุ่มวิธีใช้งาน', defaultText: 'วิธีใช้งาน' },
  { id: 'bk_doc_req_header', category: 'booking', label: 'เงื่อนไขเอกสารบังคับ: หัวข้อ', defaultText: 'เงื่อนไขเอกสารบังคับ (3 รายการ)' },
  { id: 'bk_doc_req_status', category: 'booking', label: 'เงื่อนไขเอกสาร: สถานะยังไม่ครบ', defaultText: 'ยังไม่ครบ (ขาด 3)' },
  { id: 'bk_doc_req_layout', category: 'booking', label: 'เงื่อนไขเอกสาร: Layout ขาด', defaultText: 'Layout: ขาด' },
  { id: 'bk_doc_req_wiring', category: 'booking', label: 'เงื่อนไขเอกสาร: Wiring ขาด', defaultText: 'Wiring: ขาด' },
  { id: 'bk_doc_req_precheck', category: 'booking', label: 'เงื่อนไขเอกสาร: Pre-check ขาด', defaultText: 'Pre-check: ขาด' },
  { id: 'bk_doc_req_hint', category: 'booking', label: 'เงื่อนไขเอกสาร: คำเตือนต้องครบ', defaultText: '* ต้องอัปโหลดเอกสารทั้ง 3 รายการข้างต้นให้ครบ จึงจะสามารถกดบันทึกการจองได้' },
  { id: 'bk_admin_control_section', category: 'booking', label: 'ส่วนควบคุม: วันที่ตรวจและผู้ตรวจ', defaultText: 'วันที่ตรวจและผู้ตรวจ (Admin Control)' },
  { id: 'bk_lbl_insp_date', category: 'booking', label: 'ป้าย: วันที่ตรวจ', defaultText: 'วันที่ตรวจ' },
  { id: 'bk_lbl_inspector', category: 'booking', label: 'ป้าย: ผู้ตรวจ', defaultText: 'ผู้ตรวจ' },
  { id: 'bk_lbl_product_line', category: 'booking', label: 'ป้าย: Product Line *', defaultText: 'Product Line *' },
  { id: 'bk_link_view_cert', category: 'booking', label: 'ลิงก์: ดู Certificate ผู้ตรวจ', defaultText: 'ดู Certificate' },
  { id: 'bk_lbl_job_type', category: 'booking', label: 'ป้าย: ประเภทงาน *', defaultText: 'ประเภทงาน *' },
  { id: 'bk_lbl_area', category: 'booking', label: 'ป้าย: พื้นที่ *', defaultText: 'พื้นที่ *' },
  { id: 'bk_lbl_eq_no', category: 'booking', label: 'ป้าย: Equipment No. *', defaultText: 'Equipment No. *' },
  { id: 'bk_lbl_unit_no', category: 'booking', label: 'ป้าย: Unit No.', defaultText: 'Unit No.' },
  { id: 'bk_lbl_job_name', category: 'booking', label: 'ป้าย: ชื่อโครงการ *', defaultText: 'ชื่อโครงการ *' },
  { id: 'bk_lbl_site_tech', category: 'booking', label: 'ป้าย: ช่างที่หน้างาน', defaultText: 'ช่างที่หน้างาน' },
  { id: 'bk_lbl_site_tel', category: 'booking', label: 'ป้าย: เบอร์โทรหน้างาน', defaultText: 'เบอร์โทรหน้างาน' },
  { id: 'bk_lbl_maps_link', category: 'booking', label: 'ป้าย: ลิงก์ / พิกัด Google Maps', defaultText: 'ลิงก์ / พิกัด Google Maps' },
  { id: 'bk_maps_section_title', category: 'booking', label: 'หัวข้อ: ปักหมุดบนแผนที่ Google Maps', defaultText: 'ปักหมุดบนแผนที่ Google Maps' },
  { id: 'bk_maps_section_subtitle', category: 'booking', label: 'คำอธิบาย: คลิกเพื่อเลือกตำแหน่งพิกัด', defaultText: 'คลิกเพื่อเลือกตำแหน่งพิกัดและปักหมุดนำทาง' },
  { id: 'bk_btn_open_maps', category: 'booking', label: 'ปุ่ม: เปิดแผนที่เพื่อปักหมุด', defaultText: 'เปิดแผนที่เพื่อปักหมุด' },
  { id: 'bk_maps_hint_not_pinned', category: 'booking', label: 'คำอธิบาย: ยังไม่ได้ปักหมุดพิกัด', defaultText: 'ยังไม่ได้ปักหมุดพิกัด (สามารถกดปุ่มเพื่อปักหมุดบนแผนที่จำลอง หรือค้นหาสถานที่ได้ทันที)' },
  { id: 'bk_docs_upload_section', category: 'booking', label: 'หัวข้อ: อัปโหลดเอกสารบังคับ', defaultText: 'อัปโหลดเอกสารบังคับ (ต้องครบ 3 อย่าง)' },
  { id: 'bk_btn_scan_doc', category: 'booking', label: 'ปุ่ม: สแกนเอกสาร', defaultText: 'สแกนเอกสาร' },
  { id: 'bk_lbl_layout_doc', category: 'booking', label: 'ป้าย: Layout Document *', defaultText: 'Layout Document *' },
  { id: 'bk_hint_doc_not_attached', category: 'booking', label: 'คำอธิบาย: ยังไม่ได้แนบไฟล์', defaultText: 'ยังไม่ได้แนบไฟล์ (รองรับ PDF, JPG, PNG)' },
  { id: 'bk_btn_take_photo', category: 'booking', label: 'ปุ่ม: ถ่ายรูป', defaultText: 'ถ่ายรูป' },
  { id: 'bk_btn_attach_file', category: 'booking', label: 'ปุ่ม: แนบไฟล์', defaultText: 'แนบไฟล์' },
  { id: 'bk_btn_submit', category: 'booking', label: 'ปุ่ม: ยืนยันบันทึกการจอง', defaultText: 'บันทึกการจองคิวตรวจ' },
  { id: 'bk_btn_cancel', category: 'booking', label: 'ปุ่ม: ยกเลิก', defaultText: 'ยกเลิก' },

  // ==========================================
  // 4. DAY ACTION & SPECIAL EVENTS MODAL
  // ==========================================
  { id: 'day_action_title', category: 'day_action', label: 'หัวข้อ: จัดการคิวตรวจ / วันพิเศษ', defaultText: 'จัดการคิวตรวจ / วันพิเศษ' },
  { id: 'day_action_date_lbl', category: 'day_action', label: 'ป้าย: วันที่', defaultText: 'วันที่' },
  { id: 'day_action_insp_lbl', category: 'day_action', label: 'ป้าย: ผู้ตรวจ', defaultText: 'ผู้ตรวจ' },
  { id: 'day_action_btn_booking', category: 'day_action', label: 'ปุ่ม: + จองคิวตรวจ SAIS', defaultText: '+ จองคิวตรวจ SAIS' },
  { id: 'day_action_btn_leave', category: 'day_action', label: 'ปุ่ม: จองวันลาให้พนักงาน (Leave)', defaultText: 'จองวันลาให้พนักงาน (Leave)' },
  { id: 'day_action_btn_event', category: 'day_action', label: 'ปุ่ม: เพิ่มกิจกรรมบริษัท (Event)', defaultText: 'เพิ่มกิจกรรมบริษัท (Event)' },
  { id: 'day_action_btn_holiday', category: 'day_action', label: 'ปุ่ม: เพิ่มวันหยุดบริษัท (Holiday)', defaultText: 'เพิ่มวันหยุดบริษัท (Holiday)' },

  // ==========================================
  // 5. SAIS DATA & OIL TRACKING
  // ==========================================
  { id: 'sais_modal_add_title', category: 'sais_oil', label: 'หัวข้อ: เพิ่มรายการ SAIS ใหม่', defaultText: 'เพิ่มรายการ SAIS ใหม่' },
  { id: 'sais_modal_add_sub', category: 'sais_oil', label: 'คำอธิบาย: ฐานข้อมูลงานตรวจและสถานะ SAIS', defaultText: 'ฐานข้อมูลงานตรวจและสถานะ SAIS' },
  { id: 'sais_lbl_eq_no', category: 'sais_oil', label: 'ป้าย: Equipment No. *', defaultText: 'Equipment No. *' },
  { id: 'sais_lbl_job_name', category: 'sais_oil', label: 'ป้าย: Job Site Name *', defaultText: 'Job Site Name *' },
  { id: 'sais_lbl_insp_date', category: 'sais_oil', label: 'ป้าย: Inspection Date', defaultText: 'Inspection Date' },
  { id: 'sais_lbl_gen_date', category: 'sais_oil', label: 'ป้าย: Generated Date', defaultText: 'Generated Date' },
  { id: 'sais_lbl_gen_sys', category: 'sais_oil', label: 'ป้าย: Generated In System', defaultText: 'Generated In System' },
  { id: 'sais_lbl_insp_name', category: 'sais_oil', label: 'ป้าย: Inspector Name', defaultText: 'Inspector Name' },
  { id: 'sais_lbl_product_line', category: 'sais_oil', label: 'ป้าย: Product Line', defaultText: 'Product Line' },
  { id: 'sais_lbl_type', category: 'sais_oil', label: 'ป้าย: Type', defaultText: 'Type' },
  { id: 'oil_header_title', category: 'sais_oil', label: 'หัวข้อหน้า OIL: TRACKING OIL', defaultText: 'TRACKING OIL (OPEN ITEM LIST)' },
  { id: 'oil_btn_sync_pass', category: 'sais_oil', label: 'ปุ่ม: ซิงค์งานในตารางตรวจที่มีสถานะ pass with OIL', defaultText: 'ซิงค์งานในตารางตรวจที่มีสถานะ pass with OIL' },
  { id: 'oil_btn_master_data', category: 'sais_oil', label: 'ปุ่ม: Master Data', defaultText: 'Master Data' },
  { id: 'oil_btn_add_pdf', category: 'sais_oil', label: 'ปุ่ม: + เพิ่มรายการOILจากไฟล์PDF', defaultText: '+ เพิ่มรายการOILจากไฟล์PDF' },
  { id: 'oil_card_title_fitter', category: 'sais_oil', label: 'การ์ด OIL: OIL Fitter&Supervisor', defaultText: 'OIL Fitter&Supervisor' },
  { id: 'oil_card_subtitle_days', category: 'sais_oil', label: 'การ์ด OIL: 7 วัน / 28 วัน', defaultText: '7 วัน / 28 วัน' },
  { id: 'oil_card_pending_jobs', category: 'sais_oil', label: 'การ์ด OIL: งานค้างแก้ไข: 0 ข้อ', defaultText: 'งานค้างแก้ไข: 0 ข้อ' },
  { id: 'oil_card_remaining_list', category: 'sais_oil', label: 'ตัวเลือกแถบ: รายการคงค้าง', defaultText: 'รายการคงค้าง' },
  { id: 'oil_card_closed_list', category: 'sais_oil', label: 'ตัวเลือกแถบ: ปิดรายการครบแล้ว', defaultText: 'ปิดรายการครบแล้ว' },
  { id: 'oil_btn_filter_tri', category: 'sais_oil', label: 'ตัวเลือก OIL: สามเหลี่ยม', defaultText: 'สามเหลี่ยม' },
  { id: 'oil_btn_filter_sq', category: 'sais_oil', label: 'ตัวเลือก OIL: สี่เหลี่ยม', defaultText: 'สี่เหลี่ยม' },

  // ==========================================
  // 6. ADMIN PANEL & SETTINGS
  // ==========================================
  { id: 'adm_title_main', category: 'admin', label: 'หัวข้อ: แผงควบคุมระบบ (Admin Panel)', defaultText: 'แผงควบคุมระบบ (Admin Panel)' },
  { id: 'adm_card_users', category: 'admin', label: 'เมนูแอดมิน: จัดการผู้ใช้งาน', defaultText: 'จัดการผู้ใช้งาน' },
  { id: 'adm_card_inspectors', category: 'admin', label: 'เมนูแอดมิน: ผู้ตรวจ & Certificate', defaultText: 'ผู้ตรวจ & Certificate' },
  { id: 'adm_card_events', category: 'admin', label: 'เมนูแอดมิน: จัดการวันกิจกรรม / วันลา / วันหยุดบริษัท', defaultText: 'จัดการวันกิจกรรม / วันลา / วันหยุดบริษัท' },
  { id: 'adm_card_appearance', category: 'admin', label: 'เมนูแอดมิน: 🎨 ปรับแต่งสีและรูปลักษณ์', defaultText: '🎨 ปรับแต่งสีและรูปลักษณ์ (Colors & Appearance)' },
  { id: 'adm_card_appearance_desc', category: 'admin', label: 'คำอธิบาย: ปรับแต่งสีตัวอักษร, สีพื้นหลัง, ขนาดตัวอักษรทุกส่วน, ความกว้างคอลัมน์, โหมดปากกาแก้ไขข้อความ, คลังข้อความสากล', defaultText: 'ปรับแต่งสีตัวอักษร, สีพื้นหลัง, ขนาดตัวอักษรทุกส่วน, ความกว้างคอลัมน์, โหมดปากกาแก้ไขข้อความ, คลังข้อความสากล' },
  { id: 'adm_card_cloud', category: 'admin', label: 'เมนูแอดมิน: ⚙️ จัดการระบบ Cloud & ความปลอดภัย', defaultText: '⚙️ จัดการระบบ Cloud & ความปลอดภัย (Cloud & System)' },
  { id: 'adm_title_advanced', category: 'admin', label: 'หัวข้อศูนย์ควบคุม: ศูนย์ควบคุมและตั้งค่าขั้นสูง', defaultText: 'ศูนย์ควบคุมและตั้งค่าขั้นสูง (Enterprise Pro Max)' },
  { id: 'adm_tab_general', category: 'admin', label: 'แท็บ: ระบบทั่วไป', defaultText: 'ระบบทั่วไป' },
  { id: 'adm_tab_display', category: 'admin', label: 'แท็บ: การแสดงผล & ตาราง', defaultText: 'การแสดงผล & ตาราง' },
  { id: 'adm_general_settings_header', category: 'admin', label: 'หัวข้อย่อย: การตั้งค่าทั่วไปของระบบ Schindler SAIS Thailand', defaultText: 'การตั้งค่าทั่วไปของระบบ Schindler SAIS Thailand' },
  { id: 'adm_general_settings_sub', category: 'admin', label: 'คำอธิบาย: ควบคุมการประกาศข่าวสาร สิทธิการจอง และโหมดปิดปรับปรุงชั่วคราว', defaultText: 'ควบคุมการประกาศข่าวสาร สิทธิการจอง และโหมดปิดปรับปรุงชั่วคราว' },
  { id: 'adm_announcement_banner_title', category: 'admin', label: 'ป้าย: ข้อความประกาศแจ้งเตือนระบบ (Announcement Banner):', defaultText: 'ข้อความประกาศแจ้งเตือนระบบ (Announcement Banner):' },
  { id: 'adm_show_announcement_toggle', category: 'admin', label: 'สวิตช์: เปิดแสดงข้อความประกาศบนแถบหัวเว็บ', defaultText: 'เปิดแสดงข้อความประกาศบนแถบหัวเว็บ' },
  { id: 'adm_maintenance_mode_title', category: 'admin', label: 'สวิตช์: โหมดปิดปรับปรุงระบบชั่วคราว', defaultText: 'โหมดปิดปรับปรุงระบบชั่วคราว (Maintenance Mode - เฉพาะ Admin เข้าได้)' },
  { id: 'adm_require_docs_toggle', category: 'admin', label: 'สวิตช์: บังคับแนบเอกสารครบก่อนจอง', defaultText: 'บังคับแนบเอกสาร Drawing/Wiring ครบก่อนจึงจะกดยืนยันจองคิวได้' },
  { id: 'adm_live_edit_title', category: 'admin', label: 'สวิตช์: โหมดปากกาแก้ไขข้อความหน้าเว็บแบบสด (Live Text Edit)', defaultText: 'โหมดปากกาแก้ไขข้อความหน้าเว็บแบบสด (Live Text Edit)' },
  { id: 'adm_live_edit_desc', category: 'admin', label: 'คำอธิบาย: เมื่อเปิดใช้งาน จะปรากฏปุ่มปากกาบนข้อความและหัวข้อต่างๆ บนหน้าเว็บ ให้แอดมินคลิกแก้ไขคำได้ทันที', defaultText: 'เมื่อเปิดใช้งาน จะปรากฏปุ่มปากกาบนข้อความและหัวข้อต่างๆ บนหน้าเว็บ ให้แอดมินคลิกแก้ไขคำได้ทันที' },

  // ==========================================
  // 7. AUTH & LOGIN (หน้าต่างเข้าสู่ระบบ)
  // ==========================================
  { id: 'auth_brand_title', category: 'auth', label: 'โลโก้หลัก: SAIS', defaultText: 'SAIS' },
  { id: 'auth_brand_sub', category: 'auth', label: 'สโลแกน: SCHEDULE BOOKING SYSTEM', defaultText: 'SCHEDULE BOOKING SYSTEM' },
  { id: 'auth_tab_login', category: 'auth', label: 'แท็บ: เข้าสู่ระบบ', defaultText: 'เข้าสู่ระบบ' },
  { id: 'auth_tab_register', category: 'auth', label: 'แท็บ: ลงทะเบียน', defaultText: 'ลงทะเบียน' },
  { id: 'auth_tab_forgot', category: 'auth', label: 'แท็บ: ลืมรหัสผ่าน', defaultText: 'ลืมรหัสผ่าน' },
  { id: 'auth_lbl_username', category: 'auth', label: 'ป้าย: Username *', defaultText: 'Username *' },
  { id: 'auth_lbl_password', category: 'auth', label: 'ป้าย: Password *', defaultText: 'Password *' },
  { id: 'auth_chk_remember', category: 'auth', label: 'เช็คบ็อกซ์: จดจำการเข้าสู่ระบบ (จำไว้ 24 ชม.)', defaultText: 'จดจำการเข้าสู่ระบบ (จำไว้ 24 ชม.)' },
  { id: 'auth_link_forgot', category: 'auth', label: 'ลิงก์: ลืมรหัสผ่าน?', defaultText: 'ลืมรหัสผ่าน?' },
  { id: 'auth_btn_signin', category: 'auth', label: 'ปุ่มกด: เข้าสู่ระบบ (Sign In)', defaultText: 'เข้าสู่ระบบ (Sign In)' },

  // ==========================================
  // 8. INPUT PLACEHOLDERS (ตัวอย่างข้อความในช่องกรอก)
  // ==========================================
  { id: 'ph_eq_12345678', category: 'placeholders', label: 'ตัวอย่างในช่อง Equipment No.: เช่น 12345678', defaultText: 'เช่น 12345678' },
  { id: 'ph_eq_11732041', category: 'placeholders', label: 'ตัวอย่างในช่อง Equipment No. จองคิว: เช่น 11732041', defaultText: 'เช่น 11732041' },
  { id: 'ph_job_site_name', category: 'placeholders', label: 'ตัวอย่างในช่อง Job Site: ชื่อโครงการ / สถานที่ติดตั้ง', defaultText: 'ชื่อโครงการ / สถานที่ติดตั้ง' },
  { id: 'ph_job_name_cp', category: 'placeholders', label: 'ตัวอย่างในช่องชื่อโครงการ: เช่น อาคาร ซีพี ทาวเวอร์ 3 พญาไท', defaultText: 'เช่น อาคาร ซีพี ทาวเวอร์ 3 พญาไท' },
  { id: 'ph_site_tech', category: 'placeholders', label: 'ตัวอย่างในช่องช่างหน้างาน: เช่น ช่างสมหมาย, ช่างวิชัย', defaultText: 'เช่น ช่างสมหมาย, ช่างวิชัย' },
  { id: 'ph_site_tel', category: 'placeholders', label: 'ตัวอย่างในช่องเบอร์โทร: 08XXXXXXXX', defaultText: '08XXXXXXXX' },
  { id: 'ph_maps_link', category: 'placeholders', label: 'ตัวอย่างในช่อง Google Maps: ใส่ชื่อสถานที่ หรือ URL พิกัด Google Maps', defaultText: 'ใส่ชื่อสถานที่ หรือ URL พิกัด Google Maps' },
  { id: 'ph_search_oil', category: 'placeholders', label: 'ตัวอย่างในช่องค้นหา OIL: ค้นหา Equipment No., ไซต์, UID, ช่าง...', defaultText: 'ค้นหา Equipment No., ไซต์, UID, ช่าง...' },
  { id: 'ph_search_jobs', category: 'placeholders', label: 'ตัวอย่างในช่องค้นหางาน: พิมพ์ Equipment No., ชื่อโครงการ, หรือคำค้น...', defaultText: 'พิมพ์ Equipment No., ชื่อโครงการ, หรือคำค้น...' },
  { id: 'ph_auth_username', category: 'placeholders', label: 'ตัวอย่างในช่อง Username: เช่น jirapong, somchai', defaultText: 'เช่น jirapong, somchai' },
  { id: 'ph_auth_password', category: 'placeholders', label: 'ตัวอย่างในช่อง Password: รหัสผ่าน', defaultText: 'รหัสผ่าน' },
  { id: 'ph_unit_no', category: 'placeholders', label: 'ตัวอย่างในช่อง Unit No.: เช่น L1, ESC-01', defaultText: 'เช่น L1, ESC-01' },
  { id: 'ph_announcement', category: 'placeholders', label: 'ตัวอย่างในช่องประกาศ: เช่น ประกาศ: ปิดรับคิวตรวจช่วงวันหยุดปีใหม่ หรือ กรุณ...', defaultText: 'เช่น ประกาศ: ปิดรับคิวตรวจช่วงวันหยุดปีใหม่ หรือ กรุณ...' },

  // ==========================================
  // 9. STATUS & ALERTS
  // ==========================================
  { id: 'alert_saved_success', category: 'status_alert', label: 'แจ้งเตือน: บันทึกข้อมูลสำเร็จ', defaultText: 'บันทึกข้อมูลเรียบร้อยแล้ว' },
  { id: 'alert_delete_confirm', category: 'status_alert', label: 'แจ้งเตือน: ยืนยันการลบ', defaultText: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?' },
  { id: 'alert_fill_required', category: 'status_alert', label: 'แจ้งเตือน: กรุณากรอกข้อมูลให้ครบถ้วน', defaultText: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
];

interface UniversalTextModalProps {
  customTexts: Record<string, string>;
  onSaveTexts: (updated: Record<string, string>) => void;
  onClose: () => void;
}

export const UniversalTextModal: React.FC<UniversalTextModalProps> = ({
  customTexts,
  onSaveTexts,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [localTexts, setLocalTexts] = useState<Record<string, string>>({ ...customTexts });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // New Custom Override pair state
  const [newOriginalText, setNewOriginalText] = useState<string>('');
  const [newCustomText, setNewCustomText] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const categories = [
    { id: 'all', label: 'ทั้งหมด (All)', icon: Icons.List },
    { id: 'header_nav', label: 'ส่วนหัว & นำทาง', icon: Icons.Compass },
    { id: 'calendar', label: 'ตารางปฏิทิน & คิวงาน', icon: Icons.Calendar },
    { id: 'booking', label: 'หน้าต่างจองคิว SAIS', icon: Icons.PlusCircle },
    { id: 'day_action', label: 'คิวตรวจ & วันพิเศษ', icon: Icons.Clock },
    { id: 'sais_oil', label: 'SAIS Data & OIL', icon: Icons.Database },
    { id: 'admin', label: 'แผงควบคุมระบบ (Admin)', icon: Icons.Shield },
    { id: 'auth', label: 'เข้าสู่ระบบ (Auth)', icon: Icons.Users },
    { id: 'placeholders', label: 'ตัวอย่างช่องกรอก (Placeholders)', icon: Icons.Edit },
    { id: 'status_alert', label: 'สถานะ & แจ้งเตือน', icon: Icons.Bell },
    { id: 'custom', label: 'ข้อความที่ปรับแต่งเอง (Custom)', icon: Icons.Settings },
  ];

  // Combined definitions including dynamic custom keys that aren't in the predefined list
  const combinedDefinitions = useMemo(() => {
    const predefinedIds = new Set(APP_TEXT_DEFINITIONS.map((d) => d.id));
    const predefinedDefaults = new Set(APP_TEXT_DEFINITIONS.map((d) => d.defaultText));

    const extraCustomDefs: TextDefinition[] = [];
    for (const [key, val] of Object.entries(localTexts)) {
      if (!predefinedIds.has(key) && !predefinedDefaults.has(key)) {
        extraCustomDefs.push({
          id: key,
          category: 'custom',
          label: `ข้อความกำหนดเอง: "${key.slice(0, 30)}${key.length > 30 ? '...' : ''}"`,
          defaultText: key,
        });
      }
    }

    return [...APP_TEXT_DEFINITIONS, ...extraCustomDefs];
  }, [localTexts]);

  const filteredDefinitions = useMemo(() => {
    return combinedDefinitions.filter((item) => {
      const matchesCat = activeCategory === 'all' || item.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      const currentVal = localTexts[item.id] || localTexts[item.defaultText] || item.defaultText;
      return (
        matchesCat &&
        (item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.defaultText.toLowerCase().includes(q) ||
          currentVal.toLowerCase().includes(q))
      );
    });
  }, [activeCategory, searchQuery, localTexts, combinedDefinitions]);

  const handleTextChange = (key: string, val: string) => {
    setLocalTexts((prev) => ({
      ...prev,
      [key]: val,
    }));
    setSaveSuccess(false);
  };

  const handleResetSingle = (key: string) => {
    setLocalTexts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSaveSuccess(false);
  };

  const handleAddNewOverride = () => {
    const orig = newOriginalText.trim();
    const custom = newCustomText.trim();
    if (!orig || !custom) return;

    setLocalTexts((prev) => ({
      ...prev,
      [orig]: custom,
    }));
    setNewOriginalText('');
    setNewCustomText('');
    setShowAddForm(false);
    setSaveSuccess(false);
  };

  const handleResetAll = () => {
    if (window.confirm('คุณต้องการคืนค่าเริ่มต้นของข้อความทั้งหมดใช่หรือไม่?')) {
      setLocalTexts({});
      onSaveTexts({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleSaveAll = () => {
    onSaveTexts(localTexts);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(localTexts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sais_custom_texts_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          setLocalTexts((prev) => ({ ...prev, ...parsed }));
          alert('นำเข้าไฟล์ข้อความสำเร็จ! กรุณากดปุ่ม "บันทึกข้อความทั้งหมด" เพื่อใช้งาน');
        }
      } catch (err) {
        alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  };

  const modifiedCount = useMemo(() => {
    return Object.keys(localTexts).length;
  }, [localTexts]);

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn" data-no-live-edit="true">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92dvh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-pop">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Icons.Edit size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  คลังข้อความสากล & ระบบแก้ไขข้อความสด (Universal Live Text)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px] border border-white/30">
                  {modifiedCount} รายการที่แก้ไข
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium">
                แก้ไขคำศัพท์ ทุกหัวข้อ ทุกปุ่ม ทุกตัวอย่างช่องกรอก (Placeholder) ทั่วทั้งเว็บไซต์ โดยไม่ต้องแก้ไขโค้ดซ้ำ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Toolbar: Categories & Search */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Icons.Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาตามข้อความ, ป้ายกำกับ, ตัวอย่าง..."
                className="w-full pl-9 pr-8 py-2 bg-white text-xs rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Icons.X size={14} />
                </button>
              )}
            </div>

            {/* Actions: Add custom text, Import, Export, Reset */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  showAddForm
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
                }`}
              >
                <Icons.Plus size={14} />
                <span>+ เพิ่มคู่ข้อความเอง</span>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="px-2.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1"
                title="ส่งออกข้อความทั้งหมดเป็นไฟล์ JSON"
              >
                <Icons.Download size={13} />
                <span className="hidden sm:inline">Export</span>
              </button>

              <label className="px-2.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                <Icons.Upload size={13} />
                <span className="hidden sm:inline">Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleResetAll}
                className="px-2.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1"
                title="ล้างข้อความที่แก้ไขทั้งหมด"
              >
                <Icons.RotateCcw size={13} />
                <span className="hidden sm:inline">คืนค่าทั้งหมด</span>
              </button>
            </div>
          </div>

          {/* Add Custom Override Form Drawer */}
          {showAddForm && (
            <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-3 sm:p-4 animate-fadeIn">
              <h4 className="text-xs font-black text-amber-900 mb-2 flex items-center gap-1.5">
                <Icons.PlusCircle size={14} className="text-amber-600" />
                เพิ่มข้อความที่ต้องการแทนที่บนหน้าเว็บโดยอิสระ
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-amber-950 block mb-1">
                    1. ข้อความเดิมบนหน้าเว็บ (Original Text ที่ปรากฏอยู่):
                  </label>
                  <input
                    type="text"
                    value={newOriginalText}
                    onChange={(e) => setNewOriginalText(e.target.value)}
                    placeholder="เช่น Equipment No. *, หรือคำใดๆ บนเว็บ..."
                    className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-950 block mb-1">
                    2. ข้อความใหม่ที่ต้องการแสดง (New Display Text):
                  </label>
                  <input
                    type="text"
                    value={newCustomText}
                    onChange={(e) => setNewCustomText(e.target.value)}
                    placeholder="เช่น รหัสเครื่องจักร (Eq. No.) *..."
                    className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-amber-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddNewOverride}
                  disabled={!newOriginalText.trim() || !newCustomText.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-all shadow-xs"
                >
                  + เพิ่มเข้าคลังข้อความ
                </button>
              </div>
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Icon size={13} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area: List of Editable Texts */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto space-y-3 divide-y divide-slate-100">
          {filteredDefinitions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Icons.Search size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold text-slate-600">ไม่พบข้อความที่ตรงกับการค้นหา</p>
              <p className="text-xs text-slate-400 mt-1">
                ลองค้นหาด้วยคำอื่น หรือกดปุ่ม "+ เพิ่มคู่ข้อความเอง" เพื่อเพิ่มข้อความใหม่
              </p>
            </div>
          ) : (
            filteredDefinitions.map((item) => {
              const currentVal =
                localTexts[item.id] !== undefined
                  ? localTexts[item.id]
                  : localTexts[item.defaultText] !== undefined
                  ? localTexts[item.defaultText]
                  : '';
              const isModified = currentVal !== '' && currentVal !== item.defaultText;

              return (
                <div
                  key={item.id}
                  className={`pt-3 first:pt-0 p-3 rounded-2xl transition-all ${
                    isModified
                      ? 'bg-amber-50/60 border border-amber-200 shadow-2xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {item.id}
                      </span>
                      {isModified && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black">
                          ปรับแต่งแล้ว
                        </span>
                      )}
                    </div>
                    {isModified && (
                      <button
                        type="button"
                        onClick={() => {
                          handleResetSingle(item.id);
                          handleResetSingle(item.defaultText);
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 self-start sm:self-auto hover:underline"
                      >
                        <Icons.RotateCcw size={11} /> คืนค่าเริ่มต้น
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        ข้อความเริ่มต้น (Default):
                      </span>
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-mono select-all border border-slate-200">
                        {item.defaultText}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-900 block mb-0.5">
                        ข้อความที่กำหนดเอง (Custom Text):
                      </span>
                      {item.multiline ? (
                        <textarea
                          rows={2}
                          value={currentVal || ''}
                          onChange={(e) => handleTextChange(item.id, e.target.value)}
                          placeholder={item.defaultText}
                          className="w-full p-2 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-xs bg-white text-slate-900 font-medium"
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentVal || ''}
                          onChange={(e) => handleTextChange(item.id, e.target.value)}
                          placeholder={item.defaultText}
                          className="w-full p-2 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-xs bg-white text-slate-900 font-medium"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {saveSuccess ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Icons.Check size={16} /> บันทึกข้อความและอัปเดตลงระบบเรียบร้อยแล้ว
              </span>
            ) : (
              <span>* เมื่อกดบันทึก ข้อความจะถูกอัปเดตบนหน้าจอและจัดเก็บในระบบทันที</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Icons.Check size={16} />
              <span>บันทึกข้อความทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
