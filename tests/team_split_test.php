<?php

require_once __DIR__ . '/../api/team_split_helper.php';

$checks = 0;
function check_split($condition, string $message): void
{
    global $checks;
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
}

$members = [['name' => 'Minh', 'paidAmount' => 100001], ['name' => 'An', 'paidAmount' => 40000], ['name' => 'Bình', 'paidAmount' => 0]];
$result = calculate_team_split(300001, $members);
check_split(array_column($result['members'], 'shareAmount') === [100001, 100000, 100000], 'Remainder must be allocated exactly.');
check_split(array_sum(array_column($result['members'], 'shareAmount')) === 300001, 'Shares must sum to total.');
check_split($result['collectedAmount'] === 140001 && $result['outstandingAmount'] === 160000, 'Partial payments must be counted.');
$result = calculate_team_split(100, [['name' => '<img src=x>', 'paidAmount' => 120], ['name' => 'An', 'paidAmount' => 0]]);
check_split($result['members'][0]['overpaidAmount'] === 70 && $result['outstandingAmount'] === 50, 'Overpayment must not erase another member debt.');
check_split(calculate_team_split(0, [['name' => 'An']])['members'][0]['shareAmount'] === 0, 'Zero total is valid.');
check_split(array_column(calculate_team_split(1, [['name' => 'A'], ['name' => 'B']])['members'], 'shareAmount') === [1, 0], 'Small totals must preserve remainder.');
foreach ([[], array_fill(0, 51, ['name' => 'A']), [['name' => ' ']], [['name' => 'A', 'paidAmount' => -1]], [['name' => 'A', 'paidAmount' => 1.5]], [['name' => 'A', 'paidAmount' => '100']], [['name' => str_repeat('a', 81)]], [['name' => "A\nB"]], [['name' => 'A', 'paidAmount' => 2000000001]]] as $invalid) {
    $rejected = false;
    try {
        calculate_team_split(100, $invalid);
    } catch (InvalidArgumentException $e) {
        $rejected = true;
    }
    check_split($rejected, 'Invalid input must be rejected.');
}
$booking = ['code' => 'TEST', 'user_id' => 12];
check_split(can_manage_team_split($booking, ['id' => 12], []), 'Owner must have access.');
check_split(!can_manage_team_split($booking, ['id' => 13, 'phone' => 'same'], ['TEST']), 'Another user must not gain access by code or phone.');
check_split(!can_manage_team_split($booking, null, ['TEST']), 'Guest must not access member booking.');
$booking['user_id'] = null;
check_split(can_manage_team_split($booking, null, ['TEST']), 'Guest creator must have access.');
check_split(can_manage_team_split($booking, ['id' => 12], ['TEST']), 'Guest creator keeps access after login.');
check_split(!can_manage_team_split($booking, null, []), 'Unknown guest must not have access.');
echo "PASS: {$checks} team split checks\n";