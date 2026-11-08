      <!-- TAB 2: LỊCH ĐẶT SÂN TIMELINE GANTT (Frame 12) -->
      <!-- ========================================== -->
      <div id="tab-content-timeline" class="space-y-4 hidden">
        <div class="ui-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="font-heading font-bold text-sm text-[#0F172A]">Lịch ma trận sân hôm nay:</span>
            <span class="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold">Thứ Sáu, 06/11/2026</span>
          </div>
          <!-- Legend Status Pills -->
          <div class="flex items-center gap-2 text-xs flex-wrap">
            <span class="px-2 py-0.5 rounded-full bg-white border border-[#16A34A] text-[#16A34A]">Trống</span>
            <span class="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">Đã xác nhận</span>
            <span class="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">Giữ chỗ</span>
            <span class="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#2563EB]">Đang đá</span>
            <span class="px-2 py-0.5 rounded-full hatch-slate border border-[#CBD5E1]">Bảo trì</span>
          </div>
        </div>

        <!-- Gantt Chart Container -->
        <div class="ui-card p-5 overflow-x-auto">
          <div class="min-w-[900px]">
            <!-- Timeline Hours Header 05:30 -> 22:30 -->
            <div class="grid grid-cols-12 border-b border-[#E2E8F0] pb-2 text-[11px] font-bold text-[#64748B] pl-28 text-center">
              <div>05:30</div><div>07:00</div><div>08:30</div><div>14:00</div><div>15:30</div>
              <div>17:00</div><div class="text-[#DC2626] font-extrabold">17:30 ▼</div><div>18:30</div>
              <div>20:00</div><div>21:30</div><div>22:30</div><div>23:00</div>
            </div>

            <!-- 6 Rows for 6 Pitches (Frame 12) -->
            <div id="gantt-rows" class="divide-y divide-[#E2E8F0] pt-2">
              <!-- Rendered by JS -->
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->