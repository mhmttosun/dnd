const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '..');
global.window = { DND: {} };

function loadSource(relativePath) {
  const code = fs.readFileSync(path.join(baseDir, relativePath), 'utf8');
  vm.runInThisContext(code, { filename: relativePath });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

loadSource('js/engine/ValidationEngine.js');
loadSource('js/data/TemplateProjects.js');
loadSource('js/data/TemplateLibrary.js');

const { TemplateLibrary, TEMPLATE_PROJECTS } = window.DND;
const library = new TemplateLibrary();

assert(TEMPLATE_PROJECTS.length === 19, `19 şablon bekleniyordu, ${TEMPLATE_PROJECTS.length} bulundu.`);
TEMPLATE_PROJECTS.forEach(entry => library.validateProject(entry.project));

const firstEntry = TEMPLATE_PROJECTS[0];
const sourceBefore = JSON.stringify(firstEntry.project);
const firstCopy = library.instantiate(firstEntry.id);
const secondCopy = library.instantiate(firstEntry.id);

assert(JSON.stringify(firstEntry.project) === sourceBefore, 'Kaynak şablon instantiate sırasında değiştirildi.');
assert(firstCopy.project.id !== firstEntry.project.project.id, 'Proje kimliği yenilenmedi.');
assert(firstCopy.project.id !== secondCopy.project.id, 'İki şablon kopyası aynı proje kimliğini aldı.');
assert(firstCopy.objects.length === firstEntry.project.objects.length, 'Nesne sayısı kopyada korunmadı.');

const sourceIds = new Set(firstEntry.project.objects.map(object => object.id));
const copyIds = new Set(firstCopy.objects.map(object => object.id));
assert(copyIds.size === firstCopy.objects.length, 'Kopyada yinelenen nesne kimliği oluştu.');
firstCopy.objects.forEach(object => {
  assert(!sourceIds.has(object.id), `Kaynak nesne kimliği kopyaya taşındı: ${object.id}`);
});
Object.entries(firstCopy.answerKey).forEach(([draggableId, targetId]) => {
  assert(copyIds.has(draggableId), 'Kopya answerKey anahtarı yeni nesnelere bağlanmadı.');
  assert(copyIds.has(targetId), 'Kopya answerKey hedefi yeni nesnelere bağlanmadı.');
});

const groupedProject = JSON.parse(sourceBefore);
groupedProject.objects[0].groupId = 'group_source';
groupedProject.objects[1].groupId = 'group_source';
const groupedLibrary = new TemplateLibrary([{ id: 'grouped', project: groupedProject }]);
const groupedCopy = groupedLibrary.instantiate('grouped');
assert(groupedCopy.objects[0].groupId === groupedCopy.objects[1].groupId, 'Grup üyeleri aynı yeni groupId değerini almadı.');
assert(groupedCopy.objects[0].groupId !== 'group_source', 'Kaynak groupId kopyaya taşındı.');

const invalidProject = JSON.parse(sourceBefore);
invalidProject.answerKey = { missing_drag: 'missing_target' };
let invalidRejected = false;
try {
  new TemplateLibrary([{ id: 'invalid', project: invalidProject }]).instantiate('invalid');
} catch (error) {
  invalidRejected = true;
}
assert(invalidRejected, 'Geçersiz answerKey referansına sahip şablon reddedilmedi.');

assert(library.safeColor('red; background:url(javascript:alert(1))', '#000000') === '#000000', 'Güvensiz renk değeri kabul edildi.');
assert(!library.isSafeImageSource('data:image/svg+xml,<svg onload=alert(1)>'), 'SVG data URL güvenli görsel olarak kabul edildi.');

console.log('Template library cloning and validation: OK');
