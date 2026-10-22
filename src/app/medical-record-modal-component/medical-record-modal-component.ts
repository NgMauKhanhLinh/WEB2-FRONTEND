import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MedicalRecord } from '../services/pet-service';

@Component({
  selector: 'app-medical-record-modal-component',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './medical-record-modal-component.css',
  templateUrl: './medical-record-modal-component.html',
})
export class MedicalRecordModalComponent {
  @Output() saveRecord = new EventEmitter<MedicalRecord>();
  @Output() close = new EventEmitter<void>();

  // Trạng thái hover khi người dùng đang giữ tệp rê trên vùng thả file
  isDragging = false;

  // Object chứa dữ liệu của form tạm thời
  currentRecord: MedicalRecord = {
    id: '',
    fileUrl: '',
    condition: '',
    doctor: '',
    date: '',
    notes: '',
    fileName: '',
    fileSize: '',
    fileRaw: undefined,
  };

  // Xử lý khi bấm chọn file từ hộp thoại truyền thống
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    this.processFile(file);
  }

  // Sự kiện kéo file đè lên khu vực chỉ định
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  // Sự kiện di chuột mang file rời khỏi khu vực chỉ định
  onDragLeave() {
    this.isDragging = false;
  }

  // Sự kiện thả file trực tiếp vào vùng chỉ định
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file: File = event.dataTransfer.files[0];
      this.processFile(file);
    }
  }

  // Tiện ích xử lý kiểm tra định dạng và dung lượng file (Tối đa 25MB)
  private processFile(file: File) {
    if (!file) return;

    // 1. Định nghĩa các đuôi file hợp lệ (viết thường để so sánh)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];

    // 2. Lấy đuôi của file đang tải lên (ví dụ: .pdf, .png)
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    // 3. Kiểm tra xem đuôi file có nằm trong danh sách cho phép không
    if (!allowedExtensions.includes(fileExtension)) {
      alert('Định dạng file không hợp lệ! Vui lòng chỉ chọn ảnh, PDF, Word hoặc Excel.');
      return; // Dừng lại không xử lý tiếp
    }

    // 4. Kiểm tra dung lượng (Tối đa 25MB)
    if (file.size >= 25 * 1024 * 1024) {
      alert('File vượt quá dung lượng cho phép (Tối đa 25MB)!');
      return;
    }

    // Đọc thông tin file nếu mọi thứ đều hợp lệ
    this.currentRecord.fileRaw = file;
    this.currentRecord.fileName = file.name;
    this.currentRecord.fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // Gỡ bỏ tài liệu hiện tại ra khỏi form
  removeFile(event: Event) {
    event.stopPropagation(); // Tránh kích hoạt ô click của thẻ cha
    this.currentRecord.fileRaw = undefined;
    this.currentRecord.fileName = '';
    this.currentRecord.fileSize = '';
  }

  // Khi bấm nút "Lưu ghi chú"
  onSubmit() {
    if (!this.currentRecord.condition.trim()) {
      alert('Vui lòng nhập tên bệnh án!');
      return;
    }

    // Bắn dữ liệu ra component cha và tự động đóng modal
    this.saveRecord.emit({ ...this.currentRecord });
  }

  // Khi bấm "Hủy" hoặc nút dấu "X"
  onCancel() {
    this.close.emit();
  }
}
