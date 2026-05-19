/**
 * Mock 故障库 — 30 条代表性故障
 * 每条只有两个字段:description(故障信息) + handling(处理步骤数组)
 * 数据从生产故障表 (Excel) 清理而来,详见 docs/superpowers/specs/2026-05-15-fault-library-mock.md
 */
(function (global) {
  const FAULT_LIBRARY = [
    { code: '11230042', description: '取盖器尝试三次取盖未取到盖子', handling: ['可能盖子吸不上,需要取出废弃的盖子后,重启压盖模组,再重启整机', '可能取盖器有损坏,需要排查更换对应的零部件'] },
    { code: '11230043', description: '压盖没压上。执行完压盖动作后,取盖器仍然检测到盖子', handling: ['复位各模组,重启压盖模组,再重启整机', '可能取盖器有损坏,需要排查更换对应的零部件'] },
    { code: '11230046', description: '取盖器到下限位没有取到盖子', handling: ['盖仓中没有盖子,需要补盖', '可能传感器有损坏,需要排查更换对应的零部件'] },
    { code: '11270071', description: '咖啡机无响应', handling: ['请检查主控与咖啡机通讯'] },
    { code: '11270074', description: '咖啡机缺料或故障', handling: ['打开前道粉面板查看咖啡机状态并根据提示操作'] },
    { code: '50270258', description: '咖啡机 · 右边顶部活塞初始位置故障', handling: ['检查和清洁右边顶部活塞(过滤网表面和杆部)咖啡残渣'] },
    { code: '22300105', description: '上位机和点单屏1的通讯中断超过60秒', handling: ['点单屏1出现故障,可以尝试远程重启恢复', '如果无法远程恢复,要去现场使用电箱里的点单屏1电源开关重启点单屏'] },
    { code: '22300106', description: '上位机和点单屏2的通讯中断超过60秒', handling: ['点单屏2出现故障,可以尝试远程重启恢复', '如果无法远程恢复,去现场使用电箱里的点单屏2电源开关重启点单屏'] },
    { code: '11211021', description: '485通讯故障 · 落冰、制冰、前置粉浆无应答', handling: ['断电复位重启', '检查 485 总线接线是否松动', '若仍无应答,检查总线终端电阻'] },
    { code: '11211022', description: '485通讯故障 · 后置浆粉和奶油无应答', handling: ['断电复位重启', '检查后段总线分支接线'] },
    { code: '11211023', description: '485通讯故障 · 搅拌无应答', handling: ['断电复位重启', '检查搅拌模组电源'] },
    { code: '11220031', description: '机械臂指令无法执行', handling: ['断电复位重启', '检查机械臂网线连接是否正常', '检查机械臂上电状态'] },
    { code: '11240051', description: '机械臂没有上电', handling: ['检查机械臂是否已经上电', '检查机械臂的网线是否正常连接到交换机', '检查工控机 IP 地址 / 掩码是否与手臂一致'] },
    { code: '11101011', description: '杯子无', handling: ['补充杯子', '检查杯仓出杯通道是否卡杯'] },
    { code: '11101012', description: '杯盖无', handling: ['补充杯盖', '检查杯盖仓是否倾倒'] },
    { code: '11101013', description: '水无', handling: ['确认水源已开启', '检查供水管插到底', '若有制冰机,重启制冰机后再重启上下位机'] },
    { code: '11100014', description: '废水快满了', handling: ['倾倒废水桶'] },
    { code: '11100015', description: '废水满', handling: ['立即倾倒废水桶,机器会自动恢复'] },
    { code: '11211050', description: '热杯卡住或杯子有异常', handling: ['松一下杯子', '重启水桶处落杯和上下位机开关', '若无法恢复,联系维修人员'] },
    { code: '11211051', description: '冰杯卡住或杯子有异常', handling: ['松一下杯子', '重启水桶处落杯和上下位机开关', '若无法恢复,联系维修人员'] },
    { code: '11211060', description: '出杯口 1 内有异物或传感器损坏', handling: ['出杯门多为升降电机刹车片损坏,需更换该零部件'] },
    { code: '11211061', description: '出杯口 2 内有异物或传感器损坏', handling: ['出杯门多为升降电机刹车片损坏,需更换该零部件'] },
    { code: '50270201', description: '咖啡机 · 右边蒸汽棒温度感应故障', handling: ['检查右边蒸汽棒的温度传感器', '检查电缆是否正确插入'] },
    { code: '50270202', description: '咖啡机 · 左边蒸汽棒温度感应故障', handling: ['检查左边蒸汽棒的温度传感器', '检查电缆是否正确插入'] },
    { code: '50270250', description: '咖啡机 · 蒸汽锅炉压力过高', handling: ['当压力 ≥ 2.3 bar 时触发', '检查压力传感器是否故障', '联系维修排查泄压阀'] },
    { code: '50270260', description: '咖啡机 · 未检测到 SD 卡', handling: ['请检查 SD 卡是否插入到位', '尝试重新插拔 SD 卡'] },
    { code: '50270270', description: '制冰机进水电磁阀打开,超时未补满水', handling: ['补水或修复水路问题', '重启制冰机', '重启上下位机'] },
    { code: '50270275', description: '制冰机水箱传感器相关性故障', handling: ['排查制冰机水箱传感器', '更换损坏部件'] },
    { code: '50270280', description: '制冰机机箱内温度过高 (>50℃)', handling: ['清理散热口防虫网', '重启制冰机'] },
    { code: '11270090', description: '上位机数据更新失败', handling: ['检查工控机网络连接', '尝试远程重启上位机', '若无法恢复,联系运维'] }
  ];

  /**
   * 根据 deviceId 稳定挑一条故障(同 deviceId 多次调用结果一致)
   * @param {string} deviceId
   * @returns {{code:string, description:string, handling:string[]}}
   */
  function getFaultForDevice(deviceId) {
    const id = String(deviceId || '').trim();
    if (!id) return FAULT_LIBRARY[0];
    let seed = 0;
    for (let i = 0; i < id.length; i += 1) {
      seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
    }
    return FAULT_LIBRARY[seed % FAULT_LIBRARY.length];
  }

  global.CofeFaultLibrary = {
    FAULT_LIBRARY,
    getFaultForDevice
  };
})(typeof window !== 'undefined' ? window : globalThis);
