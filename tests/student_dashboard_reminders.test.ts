import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. Reminder filter buttons removed while keeping all 7 reminder cards', () => {
  const filePath = path.resolve('src/pages/StudentDashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify category filter tabs were removed
  assert.ok(!content.includes('REMINDER_TABS'), 'REMINDER_TABS filter buttons must be removed');
  assert.ok(!content.includes('activeReminderTab'), 'activeReminderTab filter state must be removed');

  // Verify all 7 reminder cards are rendered directly
  assert.ok(content.includes('{REMINDERS.map((card) => {'), 'All reminder cards must be rendered directly from REMINDERS');
  const reminderIds = ['rem_1', 'rem_2', 'rem_3', 'rem_4', 'rem_5', 'rem_6', 'rem_7'];
  for (const id of reminderIds) {
    assert.ok(content.includes(`id: '${id}'`), `Reminder card ${id} must remain present`);
  }
});

test('2. Mobile layout spacing for reminder cards and modal tabs', () => {
  const filePath = path.resolve('src/pages/StudentDashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify section container mobile padding
  assert.ok(
    content.includes('rounded-2xl sm:rounded-3xl border border-[#CCE3FC] p-4 sm:p-8'),
    'Reminders container must have responsive padding p-4 sm:p-8'
  );

  // Verify card grid spacing
  assert.ok(
    content.includes('grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5'),
    'Cards grid must have mobile gap-3.5 and desktop gap-5'
  );

  // Verify card padding
  assert.ok(
    content.includes('p-4 sm:p-5 rounded-2xl border'),
    'Cards must have responsive padding p-4 sm:p-5'
  );

  // Verify category tag label rendering
  assert.ok(
    content.includes('{card.categoryLabel}'),
    'Each card must display its categoryLabel tag'
  );

  // Verify answers modal tabs mobile spacing
  assert.ok(
    content.includes('px-4 sm:px-8 py-3 bg-[#F8FAFD] border-b border-[#E8F3FF] overflow-x-auto flex items-center gap-2 sm:gap-2.5'),
    'Modal tabs must have responsive padding and gap-2 sm:gap-2.5 for mobile scrolling'
  );
  assert.ok(
    content.includes('min-h-[38px] px-3.5 py-1.5 rounded-xl'),
    'Modal tabs buttons must have min-h-[38px] touch targets'
  );
});

test('3. React Rules of Hooks compliance in StudentDashboardPage', () => {
  const filePath = path.resolve('src/pages/StudentDashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  const currentDateIndex = content.indexOf('const currentDateFormatted = useMemo');
  const isLoadingReturnIndex = content.indexOf('if (isLoading) {');

  assert.ok(currentDateIndex !== -1, 'useMemo hooks must exist');
  assert.ok(isLoadingReturnIndex !== -1, 'isLoading guard must exist');
  assert.ok(
    currentDateIndex < isLoadingReturnIndex,
    'All hooks MUST be declared before any conditional return'
  );
});

test('4. Clean, fast GPU-composited button tap animation configured in index.css', () => {
  const cssPath = path.resolve('src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert.ok(cssContent.includes('touch-action: manipulation;'), 'Buttons must set touch-action: manipulation to eliminate mobile tap delay');
  assert.ok(cssContent.includes('scale: 0.97;'), 'Buttons must apply subtle active tap scale animation');
  assert.ok(cssContent.includes('transition-duration: 90ms;'), 'Tap animation must be crisp and fast (90ms)');
});

test('5. Student Profile Card uses compact icon Edit Profile button without Editable or Verified tags', () => {
  const filePath = path.resolve('src/pages/StudentDashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('aria-label="Edit Profile"'), 'Icon-only Edit Profile button must expose aria-label');
  assert.ok(!content.includes('<span>Edit Profile</span>'), 'Edit Profile text label must be removed in favor of compact pencil icon button');
  assert.ok(!content.includes('Editable\n'), 'Editable badge must be removed from Age and Class cards');
  assert.ok(!content.includes('Verified\n'), 'Verified badge must be removed from School / Institution card');
});

test('6. Incomplete Welcome Hero Card uses side-by-side actions and unified progress band', () => {
  const filePath = path.resolve('src/pages/StudentDashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(
    content.includes('grid grid-cols-2 md:grid-cols-12 gap-y-4 gap-x-4 md:gap-6 items-center'),
    'Progress band must arrange Questions Completed and Current Section side-by-side on mobile and inline on desktop'
  );
  assert.ok(
    content.includes('flex items-center gap-2 sm:gap-2.5'),
    'Continue Questionnaire and Print Report actions must sit cleanly side-by-side'
  );
  assert.ok(
    content.includes('tabular-nums'),
    'Progress metrics must use tabular-nums for clean alignment'
  );
});
