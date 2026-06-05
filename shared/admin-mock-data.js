(function initSharedMockData(root) {
    const globalRoot = root || (typeof globalThis !== 'undefined' ? globalThis : {});
    const SHARED_PRODUCT_DEFAULT_OPTIONS = {
        beans: '金奖黑咖-浓香意式',
        temperature: '热',
        strength: '标准',
        syrup: '蔗糖糖浆',
        sweetness: '无糖',
        cupsize: '355ml',
        lid: '倡导环保 不使用杯盖',
        latteArt: '无'
    };
    const SHARED_DEFAULT_BUSINESS_TAGS = {
        tag_signature: {
            id: 'tag_signature',
            names: {
                zh: '招牌',
                en: 'Signature'
            },
            status: 'active'
        },
        tag_new: {
            id: 'tag_new',
            names: {
                zh: '新品',
                en: 'New'
            },
            status: 'active'
        },
        tag_breakfast: {
            id: 'tag_breakfast',
            names: {
                zh: '早餐搭配',
                en: 'Breakfast'
            },
            status: 'active'
        },
        tag_hidden: {
            id: 'tag_hidden',
            names: {
                zh: '隐藏标签',
                en: 'Hidden tag'
            },
            status: 'disabled'
        }
    };
    const SHARED_ORDER_NICKNAME_POOL = ['咖啡星球', '晨间拿铁', '豆香控', '午后微糖', '不加冰', '夜猫子', '燕麦党', '双份浓缩'];
    const SHARED_DEFAULT_ORDER_BASE = {
        year: 2026,
        month: 4,
        day: 2,
        hour: 15,
        minute: 49,
        second: 59
    };
    const SHARED_DEFAULT_ORDER_INTERVAL_MINUTES = 47;
    const SHARED_MIN_ORDER_RECORDS = 20;
    const SHARED_MULTI_ITEM_ORDER_COUNT = 5;

    function normalizeBusinessTagIds(tagIds) {
        return Array.from(new Set((Array.isArray(tagIds) ? tagIds : [])
            .map(tagId => String(tagId || '').trim())
            .filter(Boolean)));
    }

    const MOCK_RECIPE_PRESETS = [
        { baseCoffeeLiquid: 80, syrup: 25, milk: 180, foam: 20, water: 0, ice: 0, powders: 0, concentrates: 0, decorToppings: 0 },
        { baseCoffeeLiquid: 60, syrup: 0, milk: 200, foam: 35, water: 25, ice: 0, powders: 0, concentrates: 0, decorToppings: 0 },
        { baseCoffeeLiquid: 90, syrup: 30, milk: 150, foam: 0, water: 0, ice: 0, powders: 0, concentrates: 0, decorToppings: 0 },
        { baseCoffeeLiquid: 70, syrup: 0, milk: 0, foam: 0, water: 200, ice: 120, powders: 0, concentrates: 0, decorToppings: 0 },
        { baseCoffeeLiquid: 0, syrup: 0, milk: 280, foam: 0, water: 0, ice: 0, powders: 0, concentrates: 0, decorToppings: 0 },
    ];

    function buildMockOptionRecipes(product) {
        const seed = (product.id || 1) - 1;
        const presetIdx = seed % MOCK_RECIPE_PRESETS.length;
        const preset = MOCK_RECIPE_PRESETS[presetIdx];
        const groupOrder = ['baseCoffeeLiquid', 'syrup', 'milk', 'foam', 'water', 'ice', 'powders', 'concentrates', 'decorToppings'];

        const makeRecipe = (mlOverrides) => {
            const groups = {};
            groupOrder.forEach(key => {
                groups[key] = { names: [], percent: 100, ml: mlOverrides[key] || 0 };
            });
            return { groupOrder, groups };
        };

        const hotPreset = { ...preset, water: preset.water || 30, ice: 0 };
        const coldPreset = { ...preset, water: preset.water || 60, ice: preset.ice || 100, foam: 0 };
        const lightIcePreset = { ...preset, water: preset.water || 60, ice: 70, foam: 0 };

        const recipes = {};
        const links = {};
        const pid = product.id || 0;

        recipes['cupsize'] = {
            '热': makeRecipe(hotPreset),
            '标准冰': makeRecipe(coldPreset),
            '少冰': makeRecipe(lightIcePreset)
        };
        links['cupsize'] = {
            '热': 'cupsize:热:' + pid,
            '标准冰': 'cupsize:标准冰:' + pid,
            '少冰': 'cupsize:少冰:' + pid
        };

        return { optionRecipes: recipes, optionRecipeLinks: links };
    }

    function normalizeMockProduct(product) {
        const sourceProduct = product || {};
        const derivedBusinessTagIds = Array.isArray(sourceProduct.businessTagIds)
            ? sourceProduct.businessTagIds
            : (sourceProduct.featured ? ['tag_signature'] : []);
        const mockRecipe = buildMockOptionRecipes(sourceProduct);
        return {
            ...sourceProduct,
            defaultOptions: {
                ...SHARED_PRODUCT_DEFAULT_OPTIONS,
                ...(sourceProduct.defaultOptions || {})
            },
            businessTagIds: normalizeBusinessTagIds(derivedBusinessTagIds),
            optionRecipes: sourceProduct.optionRecipes || mockRecipe.optionRecipes,
            optionRecipeLinks: sourceProduct.optionRecipeLinks || mockRecipe.optionRecipeLinks
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

    function buildSharedRuntimeProducts(categories) {
        const catalog = normalizeMockCategories(categories || {});
        const seen = new Set();
        const flattened = [];

        Object.values(catalog).forEach(category => {
            (category?.items || []).forEach(item => {
                const numericId = Number(item?.id);
                const dedupeKey = Number.isFinite(numericId)
                    ? String(numericId)
                    : `${item?.names?.zh || item?.names?.en || 'product'}-${flattened.length}`;
                if (seen.has(dedupeKey)) return;
                seen.add(dedupeKey);
                flattened.push({ ...item });
            });
        });

        return flattened.filter(product => product && typeof product === 'object' && product.onSale !== false);
    }

    function padSharedOrderDatePart(value, length = 2) {
        return String(value).padStart(length, '0');
    }

    function buildSharedOrderTimeParts(index) {
        const baseMinutes = SHARED_DEFAULT_ORDER_BASE.hour * 60 + SHARED_DEFAULT_ORDER_BASE.minute;
        const totalMinutes = baseMinutes - index * SHARED_DEFAULT_ORDER_INTERVAL_MINUTES;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        return {
            year: SHARED_DEFAULT_ORDER_BASE.year,
            month: SHARED_DEFAULT_ORDER_BASE.month,
            day: SHARED_DEFAULT_ORDER_BASE.day,
            hour,
            minute,
            second: SHARED_DEFAULT_ORDER_BASE.second
        };
    }

    function formatSharedOrderCreateTime(parts) {
        return `${parts.year}年${parts.month}月${parts.day}日 ${padSharedOrderDatePart(parts.hour)}:${padSharedOrderDatePart(parts.minute)}`;
    }

    function buildSharedOrderId(parts, index) {
        return `8${parts.year}${padSharedOrderDatePart(parts.month)}${padSharedOrderDatePart(parts.day)}${padSharedOrderDatePart(parts.hour)}${padSharedOrderDatePart(parts.minute)}${padSharedOrderDatePart(parts.second)}${padSharedOrderDatePart(index, 6)}`;
    }

    function buildSharedOrderTransactionId(parts, index) {
        return `TXN${parts.year}${padSharedOrderDatePart(parts.month)}${padSharedOrderDatePart(parts.day)}${padSharedOrderDatePart(parts.hour)}${padSharedOrderDatePart(parts.minute)}${padSharedOrderDatePart(parts.second)}${padSharedOrderDatePart(index, 4)}`;
    }

    function buildSharedOrderPhone(index) {
        return `138${String(10000000 + index).padStart(8, '0')}`.slice(0, 11);
    }

    function buildSharedOrderPickupCode(index) {
        return String(100000 + (index * 137) % 900000);
    }

    function buildSharedOrderItem(product, quantity = 1) {
        return {
            name: String(product?.names?.zh || product?.names?.en || '-'),
            specs: String(product?.descs?.zh || product?.descs?.en || '').trim(),
            quantity: Math.max(1, Number(quantity) || 1)
        };
    }

    function buildSharedDefaultOrders(deviceList, productList) {
        const visibleDevices = (Array.isArray(deviceList) ? deviceList : [])
            .filter(device => device && typeof device === 'object')
            .filter(device => device.entered !== false && String(device.location || '').trim());
        const sourceDevices = visibleDevices.length
            ? visibleDevices
            : [{ id: 'RCK386', merchant: 'mer001', location: 'k8298' }];
        const sourceProducts = Array.isArray(productList) && productList.length
            ? productList
            : [{ id: 0, price: 0, names: { zh: '-' }, descs: { zh: '' } }];

        return Array.from({ length: SHARED_MIN_ORDER_RECORDS }, (_, index) => {
            const parts = buildSharedOrderTimeParts(index);
            const device = sourceDevices[index % sourceDevices.length];
            const primaryProduct = sourceProducts[index % sourceProducts.length];
            const orderItems = [buildSharedOrderItem(primaryProduct, 1)];

            if (index < SHARED_MULTI_ITEM_ORDER_COUNT && sourceProducts.length > 1) {
                const secondaryProduct = sourceProducts[(index + 3) % sourceProducts.length];
                orderItems.push(buildSharedOrderItem(secondaryProduct, index % 2 === 0 ? 2 : 1));
            }

            const amount = orderItems.reduce((sum, item) => {
                const sourceProduct = sourceProducts.find(product => String(product?.names?.zh || product?.names?.en || '-') === item.name) || primaryProduct;
                return sum + Number(sourceProduct?.price || 0) * Number(item.quantity || 1);
            }, 0);
            const status = index % 7 === 0 ? 'pending' : index % 5 === 0 ? 'cancelled' : 'done';
            const paymentStatus = status === 'pending'
                ? 'pending'
                : (status === 'cancelled' ? 'cancelled' : 'succeed');

            return {
                id: buildSharedOrderId(parts, index),
                deviceId: String(device?.id || ''),
                nickname: SHARED_ORDER_NICKNAME_POOL[index % SHARED_ORDER_NICKNAME_POOL.length],
                phone: buildSharedOrderPhone(index),
                transactionId: buildSharedOrderTransactionId(parts, index),
                product: String(orderItems[0]?.name || ''),
                specs: String(orderItems[0]?.specs || ''),
                orderItems,
                status,
                paymentStatus,
                amount: amount.toFixed(2),
                currency: 'CNY',
                pickupCode: status === 'done' && index % 6 !== 0 ? buildSharedOrderPickupCode(index) : '',
                items: orderItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
                createTime: formatSharedOrderCreateTime(parts)
            };
        });
    }

    const SHARED_DEFAULT_PRODUCTS = normalizeMockCategories({
    "3D拉花": {
        icon: "🎨",
        names: {
            zh: "3D拉花",
            en: "3D Print Coffee",
            jp: "Kawa z nadrukiem 3D"
        },
        items: [
            {
                id: 1,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/gankabuqinuo.png",
                names: {
                    zh: "干卡布其诺*",
                    en: "Dry Cappuccino*",
                    jp: "干卡布奇諾"
                },
                descs: {
                    zh: "浓缩咖啡、牛奶、大杯型",
                    en: "Espresso, milk,Grande",
                    jp: "エスプレッソ、牛乳、大型カップタイプ"
                }
            }
        ]
    },
    "生椰系列": {
        icon: "🥥",
        names: {
            zh: "生椰系列",
            en: "coconut",
            jp: "生ココナッツシリーズ"
        },
        items: [
            {
                id: 2,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/250520shengyenatie_detail.png",
                names: {
                    zh: "生椰咖啡拿铁",
                    en: "Coconut Coffee Latte",
                    jp: "ココナッツコーヒーラテ"
                },
                descs: {
                    zh: "浓缩咖啡、椰奶、大杯型",
                    en: "Espresso, Coconut milk,Grande",
                    jp: "エスプレッソ、ココナッツミルク、大型カップタイプ"
                }
            }
        ]
    },
    "手工拉花": {
        icon: "☕",
        names: {
            zh: "手工拉花",
            en: "Hand Art Coffee",
            jp: "Arte de leche artesanal"
        },
        items: [
            {
                id: 3,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/250910xinxinglahua_detail.png",
                names: {
                    zh: "拉花拿铁-心形",
                    en: "Latte Art - Heart",
                    jp: "ラテアート - ハート"
                },
                descs: {
                    zh: "浓缩咖啡、牛奶、大杯型",
                    en: "Drip coffee,milk,Grande",
                    jp: "ドリップコーヒー、牛乳、大型カップタイプ"
                }
            },
            {
                id: 4,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/250910yezilahua_detail.png",
                names: {
                    zh: "拉花拿铁-叶形",
                    en: "Latte Art - Leaf",
                    jp: "ラテアート-葉形"
                },
                descs: {
                    zh: "浓缩咖啡、牛奶、大杯型",
                    en: "Drip coffee,milk,Grande",
                    jp: "ドリップコーヒー、牛乳、大型カップタイプ"
                }
            }
        ]
    },
    "一杯冰块": {
        icon: "🧊",
        names: {
            zh: "一杯冰块",
            en: "Just Ice",
            jp: "Un vaso de hielo (o cubitos)"
        },
        items: [
            {
                id: 23,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/bingshui_detail.png",
                names: {
                    zh: "冰水",
                    en: "Ice water",
                    jp: "Ice water"
                },
                descs: {
                    zh: "水、大杯型",
                    en: "water,Grande",
                    jp: "水、大杯型"
                }
            }
        ]
    },
    "各国王牌": {
        icon: "🏆",
        names: {
            zh: "各国王牌",
            en: "Regional Specialty",
            jp: "Kawa według kraju pochodzenia"
        },
        items: [
            {
                id: 6,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/gankabuqinuo.png",
                names: {
                    zh: "干卡布其诺",
                    en: "Dry Cappuccino",
                    jp: "ドライカプチーノ"
                },
                descs: {
                    zh: "浓缩咖啡、牛奶、大杯型",
                    en: "Espresso, milk,Grande",
                    jp: "エスプレッソ、牛乳、大型カップタイプ"
                }
            },
            {
                id: 7,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/shikabuqinuo.png",
                names: {
                    zh: "湿卡布其诺",
                    en: "Wet Cappuccino",
                    jp: "湿式カプチーノ"
                },
                descs: {
                    zh: "浓缩咖啡、牛奶、大杯型",
                    en: "Espresso, milk,Grande",
                    jp: "エスプレッソ、牛乳、大型カップタイプ"
                }
            },
            {
                id: 8,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/fashioulei.png",
                names: {
                    zh: "法式欧蕾",
                    en: "Café au Lait",
                    jp: "フランス風のオーレ"
                },
                descs: {
                    zh: "滴滤咖啡、牛奶、大杯型",
                    en: "Drip coffee,milk,Grande",
                    jp: "ドリップコーヒー、牛乳、大型カップタイプ"
                }
            },
            {
                id: 9,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/zhongdongmokaqinuo.png",
                names: {
                    zh: "中东摩卡其诺",
                    en: "Middle East Mochaccino",
                    jp: "中東モカキノ"
                },
                descs: {
                    zh: "浓缩咖啡、牛奶、可可粉、大杯型",
                    en: "Espresso, milk,cocoa powder,Grande",
                    jp: "エスプレッソ、牛乳、ココアパウダー、大型カップタイプ"
                }
            },
            {
                id: 10,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/dongnanyabaikafei.png",
                names: {
                    zh: "东南亚白咖啡",
                    en: "Ipoh White Coffee",
                    jp: "東南アジア白コーヒー"
                },
                descs: {
                    zh: "滴滤咖啡、牛奶、蔗糖糖浆、大杯型",
                    en: "Drip coffee,milk,sucrose syrup,Grande",
                    jp: "ドリップコーヒー、牛乳、ショ糖水飴、大型カップタイプ"
                }
            },
            {
                id: 11,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/ribenlvchakafei.png",
                names: {
                    zh: "绿茶咖啡",
                    en: "Matcha Coffee",
                    jp: "日本の緑茶コーヒー"
                },
                descs: {
                    zh: "浓缩咖啡、抹茶粉、牛奶、大杯型",
                    en: "Espresso,matcha powder, milk,Grande",
                    jp: "エスプレッソ、抹茶粉、牛乳、大型カップタイプ"
                }
            },
            {
                id: 12,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/yishinongsuo_cn.png?v=2019091001",
                names: {
                    zh: "Espresso",
                    en: "Espresso",
                    jp: "イタリア濃縮"
                },
                descs: {
                    zh: "浓缩咖啡、60ml",
                    en: "Espress,60ml",
                    jp: "エスプレッソ、60ml"
                }
            }
        ]
    },
    "各国美式": {
        icon: "🌎",
        names: {
            zh: "各国美式",
            en: "Global Americano",
            jp: "Américain par pays"
        },
        items: [
            {
                id: 13,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/zhilimeishi_detail.png",
                names: {
                    zh: "智利美式",
                    en: "Chilean Americano",
                    jp: "シーソルト・ローズ・アメリカーノ"
                },
                descs: {
                    zh: "浓缩咖啡、水、大杯型",
                    en: "Espresso, Orange Peel,Grande",
                    jp: "エスプレッソ、オレンジピールシロップ、大型カップタイプ"
                }
            },
            {
                id: 14,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/eluosimeishi_detail.png",
                names: {
                    zh: "俄罗斯美式",
                    en: "Russian Americano",
                    jp: "シーソルト・ローズ・アメリカーノ"
                },
                descs: {
                    zh: "浓缩咖啡、水、大杯型",
                    en: "Espresso, Lemon Syrup,Grande",
                    jp: "エスプレッソ、レモンジュース、大型カップタイプ"
                }
            },
            {
                id: 15,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/xinjiapomeishi_detail.png",
                names: {
                    zh: "新加坡美式",
                    en: "Singapore Americano",
                    jp: "シーソルト・ローズ・アメリカーノ"
                },
                descs: {
                    zh: "浓缩咖啡、水、大杯型",
                    en: "Espresso, Strawberry,Grande",
                    jp: "エスプレッソ、いちご、大型カップタイプ"
                }
            },
            {
                id: 16,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/malaixiyameishi_detail.png",
                names: {
                    zh: "马来西亚美式",
                    en: "Malaysian Americano",
                    jp: "シーソルト・ローズ・アメリカーノ"
                },
                descs: {
                    zh: "浓缩咖啡、水、大杯型",
                    en: "Espresso, Monin Peach Syrup,Grande",
                    jp: "エスプレッソ、モーニン桃のシロップ、大型カップタイプ"
                }
            },
            {
                id: 17,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/danmaimeishi_detail.png",
                names: {
                    zh: "丹麦美式",
                    en: "Danish Americano",
                    jp: "シーソルト・ローズ・アメリカーノ"
                },
                descs: {
                    zh: "浓缩咖啡、水、大杯型",
                    en: "Espresso, Pina-coco,Grande",
                    jp: "エスプレッソ、Pina-coco、大型カップタイプ"
                }
            },
            {
                id: 18,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/shatemeishi_detail.png",
                names: {
                    zh: "沙特美式",
                    en: "Saudi Americano",
                    jp: "シーソルト・ローズ・アメリカーノ"
                },
                descs: {
                    zh: "浓缩咖啡、水、大杯型",
                    en: "Espresso, water,Sugar-free sea salt rose,Grande",
                    jp: "エスプレッソ、水、無糖海塩バラ、大型カップタイプ"
                }
            }
        ]
    },
    "新鲜乳饮": {
        icon: "🥛",
        names: {
            zh: "新鲜乳饮",
            en: "Fresh Milk",
            jp: "Bebida láctea fresca"
        },
        items: [
            {
                id: 19,
                price: 10,
                originalPrice: 10,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/xianniunai.png",
                names: {
                    zh: "鲜牛奶abc",
                    en: "Fresh Milk",
                    jp: "生牛乳"
                },
                descs: {
                    zh: "牛奶、大杯型",
                    en: "Milk,Grande",
                    jp: "牛乳、ココアパウダー、大型カップタイプ"
                }
            }
        ]
    },
    "本店王牌": {
        icon: "⭐",
        names: {
            zh: "本店王牌",
            en: "Ace of the store",
            jp: "líder de tiendas"
        },
        items: [
            {
                id: 20,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/ice410_410.png",
                names: {
                    zh: "纯冰块",
                    en: "Ice Cubes",
                    jp: "塊状の氷"
                },
                descs: {
                    zh: "冰",
                    en: "Ice",
                    jp: "アイス"
                }
            }
        ]
    },
    "儿童专享": {
        icon: "👧",
        names: {
            zh: "儿童专享",
            en: "Child Exclusive",
            jp: "Especial para niños"
        },
        items: [
            {
                id: 21,
                price: 10,
                originalPrice: 10,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/xianniunai.png",
                names: {
                    zh: "鲜牛奶abc",
                    en: "Fresh Milk",
                    jp: "生牛乳"
                },
                descs: {
                    zh: "牛奶、大杯型",
                    en: "Milk,Grande",
                    jp: "牛乳、ココアパウダー、大型カップタイプ"
                }
            }
        ]
    },
    "夜间安享": {
        icon: "🌙",
        names: {
            zh: "夜间安享",
            en: "Nighttime Drinks",
            jp: "Disfrute nocturno"
        },
        items: [
            {
                id: 22,
                price: 10,
                originalPrice: 10,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_ipad_detail/xianniunai.png",
                names: {
                    zh: "鲜牛奶abc",
                    en: "Fresh Milk",
                    jp: "生牛乳"
                },
                descs: {
                    zh: "牛奶、大杯型",
                    en: "Milk,Grande",
                    jp: "牛乳、ココアパウダー、大型カップタイプ"
                }
            }
        ]
    },
    "热水": {
        icon: "💧",
        names: {
            zh: "热水",
            en: "HOT WATER",
            jp: "Agua caliente"
        },
        items: [
            {
                id: 24,
                price: 14.9,
                originalPrice: 14.9,
                featured: false,
                image: "https://cofeplus.oss-cn-beijing.aliyuncs.com/product_detail/bingshui_detail.png",
                names: {
                    zh: "热水",
                    en: "hot water",
                    jp: "hot water"
                },
                descs: {
                    zh: "水、大杯型",
                    en: "water,Grande",
                    jp: "水、大杯型"
                }
            }
        ]
    }
});
    
    const SHARED_DEFAULT_DEVICES = [
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
        { id: 'RCK498', merchant: 'mer001', location: '', status: 'operational', sales: 'disabled', heartbeat: '-', entered: false },
        { id: 'RCK497', merchant: 'mer001', location: '', status: 'operational', sales: 'disabled', heartbeat: '-', entered: false }
    ];
    const SHARED_DEFAULT_ORDERS = buildSharedDefaultOrders(SHARED_DEFAULT_DEVICES, buildSharedRuntimeProducts(SHARED_DEFAULT_PRODUCTS));

    function resolveSharedDefaultDevices(storedDevices, fallbackDevices = SHARED_DEFAULT_DEVICES) {
        const safeFallbackDevices = Array.isArray(fallbackDevices)
            ? fallbackDevices.filter(device => device && typeof device === 'object')
            : [];
        const safeStoredDevices = Array.isArray(storedDevices)
            ? storedDevices.filter(device => device && typeof device === 'object')
            : [];

        if (!safeStoredDevices.length) {
            return JSON.parse(JSON.stringify(safeFallbackDevices));
        }

        const fallbackMap = safeFallbackDevices.reduce((map, device) => {
            const deviceId = String(device?.id || '').trim();
            if (!deviceId) return map;
            map[deviceId] = JSON.parse(JSON.stringify(device));
            return map;
        }, {});
        const storedIdSet = new Set();
        const prioritizedStoredDevices = safeStoredDevices.reduce((list, device) => {
            const deviceId = String(device?.id || '').trim();
            if (!deviceId || storedIdSet.has(deviceId)) return list;
            storedIdSet.add(deviceId);
            const fallbackDevice = fallbackMap[deviceId];
            if (fallbackDevice) {
                const mergedDevice = {
                    ...fallbackDevice,
                    ...JSON.parse(JSON.stringify(device))
                };
                const isFallbackPlaceholder = !String(fallbackDevice.location || '').trim() && fallbackDevice.entered === false;
                const isStoredPlaceholder = !String(device.location || '').trim() && device.entered === false;
                if (isFallbackPlaceholder && isStoredPlaceholder) {
                    mergedDevice.merchant = fallbackDevice.merchant;
                }
                list.push({
                    ...mergedDevice
                });
                return list;
            }
            list.push(JSON.parse(JSON.stringify(device)));
            return list;
        }, []);

        const missingFallbackDevices = safeFallbackDevices
            .filter(device => {
                const deviceId = String(device?.id || '').trim();
                return deviceId && !storedIdSet.has(deviceId);
            })
            .map(device => JSON.parse(JSON.stringify(device)));

        return [...prioritizedStoredDevices, ...missingFallbackDevices];
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
        defaultDevices: SHARED_DEFAULT_DEVICES,
        defaultOrders: SHARED_DEFAULT_ORDERS,
        defaultBusinessTags: SHARED_DEFAULT_BUSINESS_TAGS,
        defaultProducts: SHARED_DEFAULT_PRODUCTS,
        helpers: {
            clone(value) {
                return JSON.parse(JSON.stringify(value));
            },
            resolveDevices(storedDevices, fallbackDevices = SHARED_DEFAULT_DEVICES) {
                return resolveSharedDefaultDevices(storedDevices, fallbackDevices);
            }
        }
    };

    globalRoot.COFE_SHARED_MOCK_DATA = COFE_SHARED_MOCK_DATA;
    if (typeof globalThis !== 'undefined') {
        globalThis.COFE_SHARED_MOCK_DATA = COFE_SHARED_MOCK_DATA;
    }
})(typeof window !== 'undefined' ? window : undefined);
