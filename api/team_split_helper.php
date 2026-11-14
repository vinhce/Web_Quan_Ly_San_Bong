<?php

function can_manage_team_split(array $booking, ?array $user, array $ownedCodes): bool
{
    if (!empty($booking['user_id']) && $user !== null) {
        return !empty($booking['user_id']) && (int)$booking['user_id'] === (int)$user['id'];
    }
    return empty($booking['user_id']) && in_array($booking['code'], $ownedCodes, true);
}

function calculate_team_split(int $total, array $members): array
{
    if ($total < 0 || count($members) < 1 || count($members) > 50) {
        throw new InvalidArgumentException('Cần từ 1 đến 50 thành viên và tổng tiền hợp lệ.');
    }
    $members = array_values($members);
    $base = intdiv($total, count($members));
    $remainder = $total % count($members);
    $result = [];
    $collected = 0;
    $outstanding = 0;
    foreach ($members as $i => $member) {
        if (!is_array($member) || !is_string($member['name'] ?? null)) {
            throw new InvalidArgumentException('Tên thành viên không hợp lệ.');
        }
        $name = trim($member['name']);
        $length = preg_match_all('/./us', $name);
        $paid = $member['paidAmount'] ?? 0;
        if ($name === '' || $length === false || $length > 80 || preg_match('/[\x00-\x1F\x7F]/', $name)) {
            throw new InvalidArgumentException('Tên thành viên cần từ 1 đến 80 ký tự.');
        }
        if (!is_int($paid) || $paid < 0 || $paid > 2000000000) {
            throw new InvalidArgumentException('Số tiền đã đóng phải là số nguyên từ 0 đến 2 tỷ đồng.');
        }
        $share = $base + ($i < $remainder ? 1 : 0);
        $remaining = max(0, $share - $paid);
        $result[] = [
            'name' => $name,
            'paidAmount' => $paid,
            'shareAmount' => $share,
            'remainingAmount' => $remaining,
            'overpaidAmount' => max(0, $paid - $share)
        ];
        $collected += $paid;
        $outstanding += $remaining;
    }
    return [
        'totalAmount' => $total,
        'collectedAmount' => $collected,
        'outstandingAmount' => $outstanding,
        'members' => $result
    ];
}