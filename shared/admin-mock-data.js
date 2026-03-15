(function initSharedMockData(root) {
    const globalRoot = root || (typeof globalThis !== 'undefined' ? globalThis : {});
    const SHARED_PRODUCT_DEFAULT_OPTIONS = {
        beans: '金奖黑咖-浓香意式',
        temperature: '热',
        strength: '标准',
        syrup: '甘蔗冰糖糖浆',
        sweetness: '无糖',
        cupsize: '355ml',
        lid: '倡导环保 不使用杯盖',
        latteArt: '无'
    };

    function normalizeMockProduct(product) {
        return {
            ...product,
            defaultOptions: {
                ...SHARED_PRODUCT_DEFAULT_OPTIONS,
                ...(product && product.defaultOptions ? product.defaultOptions : {})
            }
        };
    }

    function normalizeMockCategories(categories) {
        return Object.keys(categories || {}).reduce((acc, categoryKey) => {
            const category = categories[categoryKey] || {};
            acc[categoryKey] = {
                ...category,
                items: Array.isArray(category.items)
                    ? category.items.map(item => normalizeMockProduct(item))
                    : []
            };
            return acc;
        }, {});
    }

    const COFE_SHARED_MOCK_DATA = {
        maps: {
            locationMap: {
            'k8298': '上海市中心店',
            'k8667': '北京朝阳门店',
            'k9001': '广州天河店',
            'k9002': '深圳南山店'
        },
            merchantMap: {
            'mer001': '星巴克咖啡',
            'mer002': '瑞幸咖啡',
            'mer003': '太平洋咖啡',
            'mer004': 'Costa咖啡'
        }
        },
        defaultDevices: [
            { id: 'RCK386', merchant: 'mer001', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月11日 15:06' },
            { id: 'RCK385', merchant: 'mer001', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月11日 15:06' },
            { id: 'RCK384', merchant: 'mer001', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月11日 15:06' },
            { id: 'RCK410', merchant: 'mer002', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月11日 15:06' },
            { id: 'RCK406', merchant: 'mer002', location: 'k8298', status: 'faulted', sales: 'enabled', heartbeat: '2026年2月11日 15:06' },
            { id: 'RCK405', merchant: 'mer003', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月9日 11:13' },
            { id: 'RCK408', merchant: 'mer003', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月8日 09:54' },
            { id: 'RCK407', merchant: 'mer004', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月7日 16:39' },
            { id: 'RCK409', merchant: 'mer001', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月6日 10:42' },
            { id: 'RCK404', merchant: 'mer002', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月5日 19:32' },
            { id: 'RCB036', merchant: 'mer003', location: 'k8667', status: 'operational', sales: 'enabled', heartbeat: '2026年2月4日 16:38' },
            { id: 'RCK403', merchant: 'mer004', location: 'k8298', status: 'operational', sales: 'enabled', heartbeat: '2026年2月10日 10:44' },
            { id: 'RCK402', merchant: 'mer001', location: 'k8298', status: 'operational', sales: 'disabled', heartbeat: '2026年2月10日 09:30' },
            { id: 'RCK401', merchant: 'mer002', location: 'k8298', status: 'faulted', sales: 'disabled', heartbeat: '2026年2月9日 08:15' },
            { id: 'RCK400', merchant: 'mer003', location: 'k8667', status: 'operational', sales: 'enabled', heartbeat: '2026年2月8日 14:22' },
            { id: 'RCK499', merchant: 'mer001', location: '', status: 'operational', sales: 'disabled', heartbeat: '-', entered: false },
            { id: 'RCK498', merchant: 'mer002', location: '', status: 'operational', sales: 'disabled', heartbeat: '-', entered: false },
            { id: 'RCK497', merchant: 'mer003', location: '', status: 'operational', sales: 'disabled', heartbeat: '-', entered: false }
        ],
        defaultProducts: normalizeMockCategories({
            '3D拉花': {
                icon: '🎨',
                names: { zh: '3D拉花', en: '3D Latte Art', jp: '3Dラテアート' },
                items: [
                    { id: 1, price: 9.9, featured: false, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop', names: { zh: '干卡布其诺*', en: 'Dry Cappuccino*', jp: 'ドライカプチーノ' }, descs: { zh: '浓缩咖啡、牛奶、大杯型', en: 'Espresso, milk, large cup', jp: 'エスプレッソ、ミルク、大カップ' } },
                    { id: 2, price: 9.9, featured: false, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop', names: { zh: '鲜牛奶*', en: 'Fresh Milk*' }, descs: { zh: '牛奶、大杯型', en: 'Milk, large cup' } },
                    { id: 3, price: 9.9, featured: true, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop', names: { zh: '美式拿铁*', en: 'Americano Latte*' }, descs: { zh: '浓缩咖啡、牛奶、大杯型', en: 'Espresso, milk, large cup' } },
                    { id: 4, price: 9.9, featured: false, image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&h=300&fit=crop', names: { zh: '卡布其诺*', en: 'Cappuccino*' }, descs: { zh: '浓缩咖啡、牛奶、大杯型', en: 'Espresso, milk, large cup' } },
                    { id: 5, price: 6, featured: false, image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&h=300&fit=crop', names: { zh: '新·澳白*', en: 'New Flat White*' }, descs: { zh: '浓缩精粹咖啡、牛奶、大杯型', en: 'Ristretto, milk, large cup' } }
                ]
            },
            '千人千味': {
                icon: '✨',
                names: { zh: '千人千味', en: 'Custom Taste', jp: '千人千味' },
                items: [
                    { id: 6, price: 9.9, featured: true, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop', names: { zh: '美式拿铁', en: 'Americano Latte' }, descs: { zh: '浓缩咖啡、牛奶、大杯型', en: 'Espresso, milk, large cup' } },
                    { id: 7, price: 9.9, featured: true, image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=300&fit=crop', names: { zh: '美式拿铁*', en: 'Americano Latte*' }, descs: { zh: '浓缩咖啡、牛奶、大杯型', en: 'Espresso, milk, large cup' } }
                ]
            },
            '新品推荐': {
                icon: '🆕',
                names: { zh: '新品推荐', en: 'New Arrivals', jp: '新商品' },
                items: [
                    { id: 8, price: 16.9, featured: false, image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=300&fit=crop', names: { zh: '橘皮拿铁', en: 'Orange Latte' }, descs: { zh: '浓缩咖啡、橘皮糖浆、大杯型', en: 'Espresso, orange syrup, large cup' } },
                    { id: 9, price: 9.9, featured: false, image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400&h=300&fit=crop', names: { zh: '白玉兰拿铁', en: 'Magnolia Latte' }, descs: { zh: '浓缩咖啡、牛奶、白玉兰糖浆、大杯型', en: 'Espresso, milk, magnolia syrup, large cup' } },
                    { id: 10, price: 9.9, featured: false, names: { zh: '白玉兰美式', en: 'Magnolia Americano' }, descs: { zh: '浓缩咖啡、水、白玉兰糖浆、大杯型', en: 'Espresso, water, magnolia syrup, large cup' } },
                    { id: 11, price: 9.9, featured: false, image: 'https://images.unsplash.com/photo-1610632380989-680fe40816c6?w=400&h=300&fit=crop', names: { zh: '白玉兰卡布', en: 'Magnolia Cappuccino' }, descs: { zh: '浓缩咖啡、牛奶、白玉兰糖浆、大杯型', en: 'Espresso, milk, magnolia syrup, large cup' } },
                    { id: 12, price: 9.9, featured: false, image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&h=300&fit=crop', names: { zh: '热红酒拿铁', en: 'Mulled Wine Latte' }, descs: { zh: '热红酒糖浆、牛奶、浓缩咖啡、大杯型', en: 'Wine syrup, milk, espresso, large cup' } },
                    { id: 13, price: 18.9, featured: false, names: { zh: '热红酒美式', en: 'Mulled Wine Americano' }, descs: { zh: '热红酒糖浆、水、浓缩咖啡、大杯型', en: 'Wine syrup, water, espresso, large cup' } }
                ]
            },
            '经典咖啡': {
                icon: '☕',
                names: { zh: '经典咖啡', en: 'Classic Coffee', jp: 'クラシックコーヒー' },
                items: [
                    { id: 14, price: 12.9, featured: true, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop', names: { zh: '经典美式', en: 'Classic Americano' }, descs: { zh: '双份浓缩、水、中杯型', en: 'Double espresso, water, medium cup' } },
                    { id: 15, price: 14.9, featured: false, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop', names: { zh: '榛果美式', en: 'Hazelnut Americano' }, descs: { zh: '浓缩咖啡、榛果糖浆、中杯型', en: 'Espresso, hazelnut syrup, medium cup' } },
                    { id: 16, price: 15.9, featured: false, image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&h=300&fit=crop', names: { zh: '厚乳黑咖', en: 'Milk Foam Black Coffee' }, descs: { zh: '黑咖啡、轻奶泡、大杯型', en: 'Black coffee, milk foam, large cup' } }
                ]
            },
            '奶咖系列': {
                icon: '🥛',
                names: { zh: '奶咖系列', en: 'Milk Coffee', jp: 'ミルクコーヒー' },
                items: [
                    { id: 17, price: 18.9, featured: true, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop', names: { zh: '丝绒拿铁', en: 'Velvet Latte' }, descs: { zh: '浓缩咖啡、鲜奶、丝绒奶泡', en: 'Espresso, milk, velvet foam' } },
                    { id: 18, price: 19.9, featured: false, image: 'https://images.unsplash.com/photo-1579992357154-faf4bde95b3d?w=400&h=300&fit=crop', names: { zh: '焦糖玛奇朵', en: 'Caramel Macchiato' }, descs: { zh: '牛奶、焦糖酱、浓缩咖啡', en: 'Milk, caramel, espresso' } },
                    { id: 19, price: 20.9, featured: false, image: 'https://images.unsplash.com/photo-1494314671902-399b18174975?w=400&h=300&fit=crop', names: { zh: '海盐拿铁', en: 'Sea Salt Latte' }, descs: { zh: '海盐奶盖、牛奶、咖啡', en: 'Sea-salt cream, milk, coffee' } }
                ]
            },
            '茶饮特调': {
                icon: '🍵',
                names: { zh: '茶饮特调', en: 'Tea Specials', jp: 'ティースペシャル' },
                items: [
                    { id: 20, price: 16.9, featured: false, image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=300&fit=crop', names: { zh: '抹茶牛奶', en: 'Matcha Milk' }, descs: { zh: '抹茶、牛奶、冰块', en: 'Matcha, milk, ice' } },
                    { id: 21, price: 17.9, featured: true, image: 'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?w=400&h=300&fit=crop', names: { zh: '柚香红茶', en: 'Yuzu Black Tea' }, descs: { zh: '红茶、柚子果酱、柠檬片', en: 'Black tea, yuzu jam, lemon' } },
                    { id: 22, price: 18.9, featured: false, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=300&fit=crop', names: { zh: '茉莉冷萃茶', en: 'Jasmine Cold Brew Tea' }, descs: { zh: '茉莉茶底、冷萃工艺', en: 'Jasmine tea, cold brewed' } }
                ]
            },
            '冰饮冷萃': {
                icon: '🧊',
                names: { zh: '冰饮冷萃', en: 'Cold Brew', jp: 'コールドブリュー' },
                items: [
                    { id: 23, price: 18.9, featured: false, image: 'https://images.unsplash.com/photo-1462917882517-e150004895fa?w=400&h=300&fit=crop', names: { zh: '冷萃咖啡', en: 'Cold Brew Coffee' }, descs: { zh: '冷萃咖啡液、冰块', en: 'Cold brew concentrate, ice' } },
                    { id: 24, price: 22.9, featured: true, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&h=300&fit=crop', names: { zh: '椰青冷萃', en: 'Coconut Cold Brew' }, descs: { zh: '冷萃、椰子水、轻甜感', en: 'Cold brew, coconut water' } }
                ]
            },
            '低糖轻享': {
                icon: '🌿',
                names: { zh: '低糖轻享', en: 'Light Choice', jp: 'ライトチョイス' },
                items: [
                    { id: 25, price: 17.9, featured: false, image: 'https://images.unsplash.com/photo-1527169402691-a7f2bdf3a2af?w=400&h=300&fit=crop', names: { zh: '轻盈拿铁', en: 'Light Latte' }, descs: { zh: '低脂奶、少糖、双份浓缩', en: 'Low-fat milk, less sugar, double espresso' } },
                    { id: 26, price: 15.9, featured: false, image: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=300&fit=crop', names: { zh: '燕麦美式', en: 'Oat Americano' }, descs: { zh: '美式咖啡、燕麦奶', en: 'Americano, oat milk' } }
                ]
            },
            '早餐搭配': {
                icon: '🥐',
                names: { zh: '早餐搭配', en: 'Breakfast Pairing', jp: '朝食セット' },
                items: [
                    { id: 27, price: 23.9, featured: false, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop', names: { zh: '可颂拿铁套餐', en: 'Croissant Latte Set' }, descs: { zh: '拿铁、黄油可颂、早餐组合', en: 'Latte with butter croissant' } },
                    { id: 28, price: 21.9, featured: false, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop', names: { zh: '贝果美式套餐', en: 'Bagel Americano Set' }, descs: { zh: '经典美式、谷物贝果', en: 'Americano with grain bagel' } }
                ]
            },
            '季节限定': {
                icon: '🍂',
                names: { zh: '季节限定', en: 'Seasonal Limited', jp: '季節限定' },
                items: [
                    { id: 29, price: 21.9, featured: true, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop', names: { zh: '桂花燕麦拿铁', en: 'Osmanthus Oat Latte' }, descs: { zh: '桂花糖浆、燕麦奶、浓缩咖啡', en: 'Osmanthus syrup, oat milk, espresso' } },
                    { id: 30, price: 20.9, featured: false, image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=300&fit=crop', names: { zh: '莓果冷萃', en: 'Berry Cold Brew' }, descs: { zh: '冷萃咖啡、莓果果酱、冰块', en: 'Cold brew, berry jam, ice' } },
                    { id: 31, price: 18.9, featured: false, image: 'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?w=400&h=300&fit=crop', names: { zh: '南瓜香料奶咖', en: 'Pumpkin Spice Latte' }, descs: { zh: '南瓜香料、牛奶、浓缩咖啡', en: 'Pumpkin spice, milk, espresso' } }
                ]
            }
        }),
        helpers: {
            clone(value) {
                return JSON.parse(JSON.stringify(value));
            }
        }
    };

    globalRoot.COFE_SHARED_MOCK_DATA = COFE_SHARED_MOCK_DATA;
    if (typeof globalThis !== 'undefined') {
        globalThis.COFE_SHARED_MOCK_DATA = COFE_SHARED_MOCK_DATA;
    }
})(typeof window !== 'undefined' ? window : undefined);
