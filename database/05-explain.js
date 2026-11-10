const lms = db.getSiblingDB('EduManageLms');

print('=== 1. EXPLAIN STUDENT LOOKUP BY UNIQUE INDEX (IXSCAN) ===');
printjson(lms.students.find({ studentCode: 'SV001', isDeleted: false }).explain('executionStats'));

print('=== 2. EXPLAIN CLASS SECTIONS BY COMPOUND INDEX (IXSCAN) ===');
const lecturer = lms.lecturers.findOne({ lecturerCode: 'GV001' });
const section = lms.classSections.findOne({ lecturerId: lecturer?._id });
if (section) {
  printjson(lms.classSections.find({
    academicYearId: section.academicYearId,
    semesterId: section.semesterId,
    lecturerId: section.lecturerId
  }).explain('executionStats'));
}
