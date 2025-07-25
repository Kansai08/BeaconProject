// assets/js/visitor-register.js

// URL ของ API สำหรับดึง iBeacon tags
const GET_IBEACONS_API_URL = '../../backend/staff/api/get_ibeacons.php';

// URL ของ API สำหรับลงทะเบียนผู้เยี่ยมชม
const REGISTER_VISITOR_API_URL = '../../backend/staff/api/register_visitors.php';

// ตัวแปรเก็บข้อมูลจากไฟล์ที่อัปโหลด
let uploadedFileData = null;
let currentGroupMethod = 'file'; // เริ่มต้นด้วยการแนบไฟล์

async function loadIBeacons() {
    const beaconDropdownIds = ['visitorBeacon', 'groupBeacon'];

    // เตรียมสถานะ "กำลังโหลด"
    beaconDropdownIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">กำลังโหลด iBeacon...</option>';
        }
    });

    try {
        const response = await fetch(GET_IBEACONS_API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
            beaconDropdownIds.forEach(id => {
                const select = document.getElementById(id);
                if (!select) return;

                select.innerHTML = '<option value="">เลือก iBeacon</option>';

                result.data.forEach(beacon => {
                    const option = document.createElement('option');
                    option.value = beacon.uuid;
                    option.textContent = `${beacon.tag_name} (UUID: ${beacon.uuid})`;
                    select.appendChild(option);
                });
            });
        } else {
            beaconDropdownIds.forEach(id => {
                const select = document.getElementById(id);
                if (!select) return;
                select.innerHTML = '<option value="">ไม่พบ iBeacon</option>';
            });
            Swal.fire('ข้อมูล', result.message || 'ไม่พบข้อมูล iBeacon', 'info');
        }
    } catch (error) {
        console.error('Error loading iBeacons:', error);
        beaconDropdownIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">โหลด iBeacon ล้มเหลว</option>';
            }
        });
        Swal.fire('ข้อผิดพลาด', `ไม่สามารถโหลด iBeacon ได้: ${error.message}`, 'error');
    }
}

// ฟังก์ชันสำหรับคำนวณอายุและตั้งค่า Flatpickr
function setupBirthdateInput() {
    const birthdateInput = document.getElementById('visitorBirthdate');
    const ageDisplay = document.getElementById('ageDisplay');

    if (!birthdateInput || !ageDisplay) {
        console.error('Error: Birthdate input or age display element not found.');
        return;
    }

    flatpickr(birthdateInput, {
        dateFormat: "Y-m-d",
        locale: "th",
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                const birthDate = new Date(selectedDates[0]);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                ageDisplay.textContent = `อายุ: ${age} ปี`;
            } else {
                ageDisplay.textContent = '';
            }
        }
    });
}

// ฟังก์ชันเลือกประเภทการลงทะเบียน
function selectRegistrationType(type) {
    // ลบ active class จากทุก option
    document.querySelectorAll('.type-option').forEach(option => {
        option.classList.remove('active');
    });

    // ซ่อนทุก form section
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
    });

    // เพิ่ม active class ให้ option ที่เลือก
    event.currentTarget.classList.add('active');

    // แสดง form section ที่เลือก
    if (type === 'individual') {
        document.getElementById('individualForm').classList.add('active');
    } else if (type === 'group') {
        document.getElementById('groupForm').classList.add('active');
    }
}

// ฟังก์ชันลงทะเบียนผู้เยี่ยมชมเดี่ยว
async function addIndividualVisitor() {
    const firstName = document.getElementById('individualFirstName').value.trim();
    const lastName = document.getElementById('individualLastName').value.trim();
    const gender = document.getElementById('individualGender').value;
    const beaconUUID = document.getElementById('visitorBeacon').value;
    const birthdate = document.getElementById('visitorBirthdate').value;

    if (!firstName || !lastName || !birthdate || !gender || !beaconUUID) {
        Swal.fire('กรอกไม่ครบ', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
        return;
    }

    // คำนวณอายุจากวันเกิด
    const birthDateObj = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }

    const data = {
        type: 'individual',
        first_name: firstName,
        last_name: lastName,
        age: age,
        gender: gender,
        uuid: beaconUUID
    };

    try {
        const response = await fetch(REGISTER_VISITOR_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', 'error');
            return;
        }

        const result = await response.json();

        if (result.status === 'success') {
            Swal.fire('สำเร็จ', result.message, 'success');
            fetchVisitors();

            // ล้างฟอร์ม
            document.getElementById('individualFirstName').value = '';
            document.getElementById('individualLastName').value = '';
            document.getElementById('visitorBirthdate').value = '';
            document.getElementById('ageDisplay').textContent = '';
            document.getElementById('individualGender').value = '';
            document.getElementById('visitorBeacon').value = '';
        } else {
            Swal.fire('เกิดข้อผิดพลาด', result.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเพิ่มข้อมูลได้', 'error');
    }
}

// Group method selection
function selectGroupMethod(method) {
    currentGroupMethod = method;

    // Update UI
    document.querySelectorAll('.method-option').forEach(el => el.classList.remove('active'));
    event.target.closest('.method-option').classList.add('active');

    // Show/hide sections
    if (method === 'file') {
        document.getElementById('fileUploadSection').style.display = 'block';
        document.getElementById('summarySection').style.display = 'none';
    } else {
        document.getElementById('fileUploadSection').style.display = 'none';
        document.getElementById('summarySection').style.display = 'block';
    }
}

// ตั้งค่า Drag and Drop สำหรับไฟล์
function setupDragAndDrop() {
    const uploadArea = document.querySelector('.upload-area');
    if (!uploadArea) return;

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload({ target: { files: files } });
        }
    });
}

// ฟังก์ชันจัดการการอัปโหลดไฟล์ Excel
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
    ];
    
    if (!validTypes.includes(file.type)) {
        Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls) เท่านั้น', 'error');
        event.target.value = ''; // ล้างการเลือกไฟล์
        return;
    }

    // แสดงสถานะกำลังโหลด
    const uploadArea = document.querySelector('.upload-area');
    const originalContent = uploadArea.innerHTML;
    uploadArea.innerHTML = `
        <div class="upload-icon">⏳</div>
        <div class="upload-text">กำลังอ่านไฟล์...</div>
    `;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            // อ่านไฟล์ Excel
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 2 });

            if (jsonData.length === 0) {
                Swal.fire('ข้อผิดพลาด', 'ไฟล์ Excel ว่างเปล่า', 'error');
                uploadArea.innerHTML = originalContent;
                return;
            }

            // ตรวจสอบคอลัมน์ที่จำเป็น
            const requiredColumns = ['ชื่อ', 'นามสกุล', 'อายุ', 'เพศ'];
            const fileColumns = Object.keys(jsonData[0]);
            const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col));

            if (missingColumns.length > 0) {
                Swal.fire('ข้อผิดพลาด', `ไฟล์ขาดคอลัมน์ที่จำเป็น: ${missingColumns.join(', ')}`, 'error');
                uploadArea.innerHTML = originalContent;
                return;
            }

            // ตรวจสอบความถูกต้องของข้อมูล
            const validationErrors = validateExcelData(jsonData);
            if (validationErrors.length > 0) {
                Swal.fire({
                    title: 'พบข้อผิดพลาดในข้อมูล',
                    html: validationErrors.join('<br>'),
                    icon: 'warning',
                    confirmButtonText: 'แก้ไขและอัปโหลดใหม่'
                });
                uploadArea.innerHTML = originalContent;
                return;
            }

            // เก็บข้อมูลและแสดงตัวอย่าง
            uploadedFileData = processExcelData(jsonData);
            displayFilePreview(uploadedFileData);
            
            // อัปเดต UI สำเร็จ
            uploadArea.innerHTML = `
                <div class="upload-icon"><i class="fa-regular fa-circle-check"></i></div>
                <div class="upload-text">อัปโหลดสำเร็จ! ${file.name}</div>
                <div class="upload-hint">คลิกเพื่อเลือกไฟล์ใหม่</div>
            `;

        } catch (error) {
            console.error('Error reading file:', error);
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์', 'error');
            uploadArea.innerHTML = originalContent;
        }
    };

    reader.onerror = function() {
        Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการอ่านไฟล์', 'error');
        uploadArea.innerHTML = originalContent;
    };

    reader.readAsBinaryString(file);
}

// ฟังก์ชันตรวจสอบความถูกต้องของข้อมูล Excel
function validateExcelData(data) {
    const errors = [];
    const validGenders = ['ชาย', 'หญิง', 'อื่นๆ', 'male', 'female', 'other'];

    data.forEach((row, index) => {
        const rowNum = index + 2; // +2 เพราะเริ่มจากแถว 2 (แถว 1 เป็น header)

        // ตรวจสอบชื่อ
        if (!row['ชื่อ'] || row['ชื่อ'].toString().trim() === '') {
            errors.push(`แถว ${rowNum}: ชื่อไม่สามารถเว้นว่างได้`);
        }

        // ตรวจสอบนามสกุล
        if (!row['นามสกุล'] || row['นามสกุล'].toString().trim() === '') {
            errors.push(`แถว ${rowNum}: นามสกุลไม่สามารถเว้นว่างได้`);
        }

        // ตรวจสอบอายุ
        const age = parseInt(row['อายุ']);
        if (isNaN(age) || age < 0 || age > 150) {
            errors.push(`แถว ${rowNum}: อายุต้องเป็นตัวเลข 0-150`);
        }

        // ตรวจสอบเพศ
        if (!row['เพศ'] || !validGenders.includes(row['เพศ'].toString().toLowerCase())) {
            errors.push(`แถว ${rowNum}: เพศต้องเป็น ชาย, หญิง, หรือ อื่นๆ`);
        }
    });

    return errors;
}

// ฟังก์ชันประมวลผลข้อมูล Excel
function processExcelData(data) {
    return data.map(row => {
        // แปลงเพศให้เป็นรูปแบบที่ฐานข้อมูลรองรับ
        let gender = row['เพศ'].toString().toLowerCase();
        if (gender === 'ชาย') gender = 'male';
        else if (gender === 'หญิง') gender = 'female';
        else if (gender === 'อื่นๆ') gender = 'other';

        return {
            first_name: row['ชื่อ'].toString().trim(),
            last_name: row['นามสกุล'].toString().trim(),
            age: parseInt(row['อายุ']),
            gender: gender,
            // หมายเหตุ: uuid จะถูกกำหนดเมื่อบันทึกข้อมูล
        };
    });
}

// ฟังก์ชันแสดงตัวอย่างข้อมูลจากไฟล์
function displayFilePreview(data) {
    const preview = document.getElementById('filePreview');
    const previewTable = document.getElementById('previewTable');
    const fileSummary = document.getElementById('fileSummary');

    if (!preview || !previewTable || !fileSummary) {
        console.error('Preview elements not found');
        return;
    }

    // แสดง 5 รายการแรกเป็นตัวอย่าง
    const previewData = data.slice(0, 5);
    let tableHtml = `
        <table class="table" style="font-size: 12px;">
            <thead>
                <tr>
                    <th>ชื่อ</th>
                    <th>นามสกุล</th>
                    <th>อายุ</th>
                    <th>เพศ</th>
                </tr>
            </thead>
            <tbody>
    `;

    previewData.forEach(row => {
        const genderText = row.gender === 'male' ? 'ชาย' : 
                          row.gender === 'female' ? 'หญิง' : 'อื่นๆ';
        tableHtml += `
            <tr>
                <td>${row.first_name}</td>
                <td>${row.last_name}</td>
                <td>${row.age}</td>
                <td>${genderText}</td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';

    if (data.length > 5) {
        tableHtml += `<p style="text-align: center; color: #666; margin-top: 10px;">และอีก ${data.length - 5} รายการ</p>`;
    }

    previewTable.innerHTML = tableHtml;

    // สร้างสรุปข้อมูล
    const maleCount = data.filter(row => row.gender === 'male').length;
    const femaleCount = data.filter(row => row.gender === 'female').length;
    const otherCount = data.filter(row => row.gender === 'other').length;
    const totalCount = data.length;

    fileSummary.innerHTML = `
        <div class="summary-row">
            <span>จำนวนชาย</span>
            <span>${maleCount} คน</span>
        </div>
        <div class="summary-row">
            <span>จำนวนหญิง</span>
            <span>${femaleCount} คน</span>
        </div>
        ${otherCount > 0 ? `
        <div class="summary-row">
            <span>จำนวนอื่นๆ:</span>
            <span>${otherCount} คน</span>
        </div>
        ` : ''}
        <div class="summary-row summary-total">
            <span>รวมทั้งหมด</span>
            <span>${totalCount} คน</span>
        </div>
    `;

    preview.style.display = 'block';
}

// ฟังก์ชันลงทะเบียนกลุ่มด้วยไฟล์ Excel
async function addGroupVisitorFromFile() {
    const groupName = document.getElementById('groupName').value.trim();
    const groupType = document.getElementById('groupType').value.trim(); // เพิ่ม .trim()
    const beaconUUID = document.getElementById('groupBeacon').value;

    // ตรวจสอบข้อมูลพื้นฐาน
    if (!groupName || !groupType || !beaconUUID) {
        Swal.fire('กรอกไม่ครบ', 'กรุณากรอกชื่อกลุ่ม ประเภทกลุ่ม และเลือก iBeacon', 'warning');
        return;
    }

    // ตรวจสอบไฟล์ที่อัปโหลด
    if (!uploadedFileData || uploadedFileData.length === 0) {
        Swal.fire('ไม่พบไฟล์', 'กรุณาอัปโหลดไฟล์ Excel ก่อน', 'warning');
        return;
    }

    // เตรียมข้อมูลสำหรับส่งไปยัง API
    const groupData = {
        type: 'group',
        group_name: groupName,
        group_type: groupType, // ตอนนี้จะเป็นค่าที่กรอกเอง
        group_size: uploadedFileData.length,
        uuid: beaconUUID,
        members: uploadedFileData,
        registration_method: 'excel' // เพิ่มเพื่อระบุวิธีการลงทะเบียน
    };

    console.log('Group data to be sent:', groupData);

    try {
        // แสดงสถานะกำลังบันทึก
        Swal.fire({
            title: 'กำลังบันทึกข้อมูล...',
            text: `กำลังลงทะเบียนกลุ่ม ${groupName} (${groupType}) จำนวน ${uploadedFileData.length} คน`,
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch(REGISTER_VISITOR_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groupData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', 'error');
            return;
        }

        const result = await response.json();

        if (result.status === 'success') {
            Swal.fire({
                title: 'สำเร็จ!',
                text: `ลงทะเบียนกลุ่ม ${groupName} (${groupType}) สำเร็จ จำนวน ${uploadedFileData.length} คน`,
                icon: 'success',
                confirmButtonText: 'ตกลง'
            });

            // ล้างฟอร์มและข้อมูล
            clearGroupForm();
            fetchVisitors(); // รีเฟรชตารางข้อมูล

        } else {
            Swal.fire('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถลงทะเบียนได้', 'error');
        }

    } catch (error) {
        console.error('Error registering group:', error);
        Swal.fire('ข้อผิดพลาด', `ไม่สามารถลงทะเบียนได้: ${error.message}`, 'error');
    }
}

// ฟังก์ชันล้างฟอร์มกลุ่ม
function clearGroupForm() {
    // ล้างข้อมูลพื้นฐาน
    document.getElementById('groupName').value = '';
    document.getElementById('groupType').value = ''; // input text แทน select
    document.getElementById('groupBeacon').value = '';

    // ล้างข้อมูลไฟล์
    uploadedFileData = null;
    const fileInput = document.getElementById('excelFile');
    if (fileInput) fileInput.value = '';

    // ซ่อนตัวอย่าง
    const preview = document.getElementById('filePreview');
    if (preview) preview.style.display = 'none';

    // รีเซ็ต upload area
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
        uploadArea.innerHTML = `
            <div class="upload-icon">📁</div>
            <div class="upload-text">คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่</div>
            <div class="upload-hint">รองรับไฟล์ .xlsx, .xls เท่านั้น</div>
            <input type="file" id="excelFile" class="file-input" accept=".xlsx,.xls" onchange="handleFileUpload(event)">
        `;
    }
}

// เพิ่มฟังก์ชันสำหรับ validation ประเภทกลุ่ม (ถ้าต้องการ)
function validateGroupType(groupType) {
    // ตรวจสอบความยาว
    if (groupType.length < 2 || groupType.length > 100) {
        return false;
    }
    
    // ตรวจสอบอักขระพิเศษ (ถ้าต้องการจำกัด)
    const allowedPattern = /^[ก-ฮะ-์a-zA-Z0-9\s\-\/()]+$/;
    return allowedPattern.test(groupType);
}

function setupGroupTypeInput() {
    const groupTypeInput = document.getElementById('groupType');
    if (!groupTypeInput) return;

    // เพิ่มการแสดงคำแนะนำเมื่อ focus
    groupTypeInput.addEventListener('focus', function() {
        // สามารถเพิ่ม tooltip หรือ hint ได้ที่นี่
        this.placeholder = 'เช่น นักเรียนมัธยมต้น, ทัวร์ครอบครัว, พนักงานบริษัท ABC';
    });

    groupTypeInput.addEventListener('blur', function() {
        this.placeholder = 'กรอกประเภทกลุ่ม';
    });

    // เพิ่มการตรวจสอบแบบ real-time (ถ้าต้องการ)
    groupTypeInput.addEventListener('input', function() {
        const value = this.value.trim();
        if (value && !validateGroupType(value)) {
            this.style.borderColor = '#ff6b6b';
        } else {
            this.style.borderColor = '';
        }
    });
}

// Summary method functions
function updateSummary() {
    const ageGroups = [
        { prefix: 'age0_5', label: '0-5 ปี' },
        { prefix: 'age6_11', label: '6-11 ปี' },
        { prefix: 'age12_17', label: '12-17 ปี' },
        { prefix: 'age18_59', label: '18-59 ปี' },
        { prefix: 'age60', label: '60+ ปี' }
    ];

    let totalMale = 0;
    let totalFemale = 0;

    ageGroups.forEach(group => {
        const maleInput = document.getElementById(group.prefix + '_male');
        const femaleInput = document.getElementById(group.prefix + '_female');

        totalMale += parseInt(maleInput.value) || 0;
        totalFemale += parseInt(femaleInput.value) || 0;
    });

    const totalMembers = totalMale + totalFemale;

    document.getElementById('totalMale').textContent = `${totalMale} คน`;
    document.getElementById('totalFemale').textContent = `${totalFemale} คน`;
    document.getElementById('totalMembers').textContent = `${totalMembers} คน`;
}

function applyVisitorFilter() {
    const selectedFilter = document.getElementById('typeFilter').value;
    fetchVisitors(selectedFilter);
}

// ฟังก์ชันสำหรับดึงข้อมูลผู้เยี่ยมชมและแสดงในตาราง
async function fetchVisitors(filter = 'all') {
    const visitorsTableHead = document.querySelector('.table thead');
    const visitorsTableBody = document.getElementById('visitorsTable');

    if (!visitorsTableBody) {
        console.error('Visitors table body not found');
        return;
    }

    visitorsTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center;">กำลังโหลดข้อมูลผู้เยี่ยมชม...</td></tr>`;

    try {
        const response = await fetch('../../backend/staff/api/get_visitors.php', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.status !== 'success' || !Array.isArray(result.data)) {
            visitorsTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: orange;">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
            return;
        }

        let data = result.data;

        if (filter === 'individual') {
            data = data.filter(v => v.type === 'individual');
        } else if (filter === 'group') {
            data = data.filter(v => v.type === 'group_member');
        } else {
            // เอาเฉพาะ individual และ group summary (ไม่เอาสมาชิกกลุ่ม)
            data = data.filter(v => v.type === 'individual' || v.type === 'group');
        }

        let theadHTML = '';
        if (filter === 'individual') {
            theadHTML = `
                <tr>
                    <th>ชื่อ</th>
                    <th>อายุ</th>
                    <th>เพศ</th>
                    <th>Tag</th>
                    <th>UUID</th>
                </tr>`;
        } else if (filter === 'group') {
            theadHTML = `
                <tr>
                    <th>ชื่อกลุ่ม</th>
                    <th>ชื่อสมาชิก</th>
                    <th>อายุ</th>
                    <th>เพศ</th>
                    <th>Tag</th>
                    <th>UUID</th>
                </tr>`;
        } else {
            theadHTML = `
                <tr>
                    <th>ประเภท</th>
                    <th>ชื่อ/ชื่อกลุ่ม</th>
                    <th>อายุ</th>
                    <th>เพศ</th>
                    <th>Tag</th>
                    <th>UUID</th>
                </tr>`;
        }

        visitorsTableHead.innerHTML = theadHTML;
        visitorsTableBody.innerHTML = '';

        if (data.length === 0) {
            visitorsTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center;">ไม่พบข้อมูล</td></tr>`;
            return;
        }

        data.forEach(visitor => {
            const gender = visitor.gender === 'male' ? 'ชาย' :
                           visitor.gender === 'female' ? 'หญิง' : 'อื่นๆ';
            const tag = visitor.tag_name || 'ไม่พบชื่อ';
            const uuid = visitor.uuid || 'ไม่ระบุ';

            let row = '';

            if (filter === 'individual') {
                row = `
                    <tr>
                        <td>${visitor.name}</td>
                        <td>${visitor.age || '-'}</td>
                        <td>${gender}</td>
                        <td>${tag}</td>
                        <td>${uuid}</td>
                    </tr>`;
            } else if (filter === 'group') {
                if (visitor.type === 'group') {
                    const ageRange = visitor.min_age && visitor.max_age ? `${visitor.min_age}-${visitor.max_age}` : '-';
                    const genderSummary = `M${visitor.male_count} F${visitor.female_count}`;
                    row = `
                        <tr>
                            <td>${visitor.group_name}</td>
                            <td>-</td>
                            <td>${ageRange}</td>
                            <td>${genderSummary}</td>
                            <td>${tag}</td>
                            <td>${uuid}</td>
                        </tr>`;
                } else if (visitor.type === 'group_member') {
                    row = `
                        <tr>
                            <td>${visitor.group_name}</td> <!-- ใส่ชื่อกลุ่มตรงนี้ -->
                            <td>${visitor.name}</td>
                            <td>${visitor.age || '-'}</td>
                            <td>${gender}</td>
                            <td>${tag}</td>
                            <td>${uuid}</td>
                        </tr>`;
                }
            } else {
                const isGroup = visitor.type === 'group';

                if (isGroup) {
                    const ageRange = visitor.min_age && visitor.max_age ? `${visitor.min_age}-${visitor.max_age}` : '-';
                    const genderSummary = `M${visitor.male_count} F${visitor.female_count}`;
                    row = `
                        <tr>
                            <td>กลุ่ม</td>
                            <td>${visitor.group_name}</td>
                            <td>${ageRange}</td>
                            <td>${genderSummary}</td>
                            <td>${tag}</td>
                            <td>${uuid}</td>
                        </tr>`;
                } else {
                    row = `
                        <tr>
                            <td>เดี่ยว</td>
                            <td>${visitor.name}</td>
                            <td>${visitor.age || '-'}</td>
                            <td>${gender}</td>
                            <td>${tag}</td>
                            <td>${uuid}</td>
                        </tr>`;
                }
            }

            visitorsTableBody.innerHTML += row;
        });

    } catch (error) {
        visitorsTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: red;">โหลดข้อมูลล้มเหลว: ${error.message}</td></tr>`;
        Swal.fire('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลได้: ${error.message}`, 'error');
    }
}

// ฟังก์ชันสำหรับใช้ filter
function applyVisitorFilter() {
    const selectedFilter = document.getElementById('typeFilter').value;
    fetchVisitors(selectedFilter);
}

// ฟังก์ชันสำหรับโหลดข้อมูลผู้ใช้ใน Sidebar
function loadUserProfile() {
    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");
    const sidebarLoginTime = document.getElementById("sidebarLoginTime");

    if (!profileName || !profileRole || !sidebarLoginTime) {
        console.warn('Warning: Sidebar profile elements not found.');
        return;
    }

    const firstname = localStorage.getItem("firstname");
    const lastname = localStorage.getItem("lastname");
    const role = localStorage.getItem("role");
    const loginTime = localStorage.getItem("loginTime");

    if (firstname && lastname) {
        profileName.textContent = `คุณ${firstname} ${lastname}`;
    } else {
        profileName.textContent = 'ผู้ใช้งาน';
    }

    if (role) {
        const roleText = {
            admin: "ผู้ดูแลระบบ",
            manager: "ผู้บริหาร",
            staff: "เจ้าหน้าที่"
        };
        profileRole.textContent = roleText[role] || "ผู้ใช้งาน";
    } else {
        profileRole.textContent = 'บทบาทไม่ระบุ';
    }

    if (loginTime) {
        sidebarLoginTime.textContent = `เข้าสู่ระบบ: ${loginTime}`;
    } else {
        sidebarLoginTime.textContent = 'เข้าสู่ระบบ: --:--';
    }
}

// ฟังก์ชัน Logout
function logout() {
    localStorage.clear();
    window.location.href = '../login.html';
}

function downloadTemplate() {
    window.location.href = '../../assets/template/template-visitor.xlsx';
}

// ฟังก์ชันเมื่อ DOM พร้อมทำงาน
document.addEventListener("DOMContentLoaded", function () {
    loadUserProfile();
    setupBirthdateInput();
    loadIBeacons();
    fetchVisitors();
    setupDragAndDrop();
    setupGroupTypeInput(); // เพิ่มบรรทัดนี้
    
    // อัปเดตการเรียกใช้ฟังก์ชัน
    const groupRegisterBtn = document.querySelector('button[onclick="addGroupVisitor()"]');
    if (groupRegisterBtn) {
        groupRegisterBtn.setAttribute('onclick', 'addGroupVisitorFromFile()');
    }
});