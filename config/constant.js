module.exports = {
    // 画像タイプ
    TYPE_JPEG: 'image/jpeg',
    TYPE_PNG: 'image/png',
    TYPE_GIF: 'image/gif',
    IDENTIFIER_USER: 'user',
    IDENTIFIER_CLAN: 'clan',
    // プロフィール画像
    CLANPROFIMGDIR: 'tmp/img/clan/profile/',
    USERPROFIMGDIR: 'tmp/img/user/profile/',
    CLANPROFIMG: 'clan_prof_def_thumb.png',
    USERPROFIMG: 'user_prof_def_thumb.jpg',
    // DBのフラグ値
    FLG_YES: 1,
    FLG_NO:  0,
    // トラッカー
    tracker: [
        'マッチング',
        '作業依頼',
        '通達'
    ],
    tracker_match: '0',
    tracker_work: '1',
    tracker_notification: '2',
    // ステータス（マッチング）
    status_matching: [
        '新規',
        '承認待ち',
        '承認却下',
        '承認済み',
        '終了',
        '中止'
    ],
    status_matching_create: [
        '新規',
        '承認待ち'
    ],
    // ステータス（作業依頼）
    status_working: [
        '新規',
        '作業中',
        '終了',
        '中止'
    ],
    // ステータス（通達）
    status_notification: [
        '新規',
        '終了',
        '中止'
    ],
    // タブ
    tabs: {
        clan: [
            {
                action: 'calender',
                name: 'カレンダー'
            },
            {
                action: 'gantt',
                name: 'ガントチャート'
            },
            {
                action: 'analysis',
                name: '分析'
            },
            {
                action: 'profile',
                name: 'クラン'
            }
        ],
        project: [
            {
                action: 'ticket',
                name: 'チケット'
            },
            {
                action: 'calender',
                name: 'カレンダー'
            },
            {
                action: 'gantt',
                name: 'ガントチャート'
            },
            {
                action: 'analysis',
                name: '分析'
            }
        ]
    },
    // デフォルトタブ
    clan_tabs: {
        profile: {
            actions: [],
            name: 'プロフィール'
        },
        status: {
            actions: [],
            name: '戦績'
        }
    },
    // 配信可否
    live: [
        'いいえ',
        'はい'
    ],
    live_yes: '1',
    live_no: '0',
    date_blank: '0000-00-00 00:00:00',
    
    // パス
    img_path: '/images/',

    // テーブル名
    TBL_MATCH: 'fight_tickets',
    TBL_WORK: 'work_tickets',
    TBL_NOTIFICATE: 'notification_tickets',

    // URL
    SEPARATOR1: '&',
    SEPARATOR2: '=',
    CNTR: 'controller',
    ACTN: 'action',

    // Controller Name
    CNTR_HOME: 'home',

    // Action Name
    ACTN_HOME_DEF: 'index',
};