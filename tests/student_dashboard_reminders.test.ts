import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. Reminder category tabs and counts match reminder data exactly', () => {
  const filePath = path.resolve('src/pages/StudentDashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify REMINDER_TABS definition
  assert.ok(content.includes("const REMINDER_TABS = ["), 'REMINDER_TABS must be defined');
  assert.ok(content.includes("{ id: 'all', label: 'All', count: 7 }"), 'All tab must have count 7');
  assert.ok(content.includes("{ id: 'mindset', label: 'Mindset', count: 3 }"), 'Mindset tab must have count 3');
  assert.ok(content.includes("{ id: 'growth', label: 'Curiosity & Growth', count: 2 }"), 'Growth tab must have count 2');
  assert.ok(content.includes("{ id: 'wellbeing', label: 'Well-being', count: 1 }"), 'Wellbeing tab must have count 1');
  assert.ok(content.includes("{ id: 'connection', label: 'Friendship', count: 1 }"), 'Friendship tab must have count 1');
});

test('2. Mobile layout spacing and touch targets for tabs and cards', () => {
  const filePath = path.resolve('src/pages/StudentDashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify section container mobile padding
  assert.ok(
    content.includes('rounded-2xl sm:rounded-3xl border border-[#CCE3FC] p-4 sm:p-8'),
    'Reminders container must have responsive padding p-4 sm:p-8'
  );

  // Verify tab container edge-to-edge mobile scroll with negative margins
  assert.ok(
    content.includes('-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 sm:gap-2.5 overflow-x-auto'),
    'Tabs must use negative margins -mx-4 px-4 and gap-2 sm:gap-2.5 for mobile horizontal scrolling'
  );

  // Verify tab buttons have at least 40px touch targets
  assert.ok(
    content.includes('min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl'),
    'Tab buttons must have comfortable touch height min-h-[40px] and rounded-xl/2xl'
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

  const filteredRemindersIndex = content.indexOf('const filteredReminders = useMemo');
  const isLoadingReturnIndex = content.indexOf('if (isLoading) {');

  assert.ok(filteredRemindersIndex !== -1, 'filteredReminders hook must exist');
  assert.ok(isLoadingReturnIndex !== -1, 'isLoading guard must exist');
  assert.ok(
    filteredRemindersIndex < isLoadingReturnIndex,
    'filteredReminders hook MUST be declared before any conditional return'
  );
});
