var Const = {
    // セレクタ
    // プロジェクト
    CREATE_PROJECT_DLG: '#createProjectDlg',
    // チケット
    TICKET: '#ticket',
    CREATE_MATCHING_DLG: '#createMatchingTicketDlg',
    UPDATE_TICKET_TPL: '.updateTicketTpl',
    UPDATE_MATCHING_TPL: '#updateMatchingTicketTpl',
    UPDATE_WORKING_TPL: '#updateWorkingTicketTpl',
    UPDATE_NOTIFICATION_TPL: '#updateNotificationTicketTpl',
    TICKET_RESULT_DLG: 'ticketResultDlg',

    MATCH: '0',
    WORK: '1',
    NOTIFICATION: '2',
    TRACKER_LIST: [
        'マッチング',
        '作業依頼',
        '通達'
    ],
    STATUS_LIST: [
        ['新規', '承認待ち', '承認却下', '承認済み', '終了', '中止'],
        ['新規', '作業中', '終了', '中止'],
        ['新規', '終了', '中止']
    ],
    NO_DATE: '0000-00-00',

    // DB
    MATCHING_NEW: '0',
    MATCHING_END: '4',
    LIVE_NO: '0',
    LIVE_YES: '1',
    DRAW_NO: '0',
    DRAW_YES: '1',
    FLG_YES: '1',
    FLG_NO: '0',
    DML_INSERT: 'i',
    DML_DELETE: 'd',
    DATE_BLANK: '0000-00-00 00:00:00',

    // URL
    SEPARATOR1: '&',
    SEPARATOR2: '=',
    CNTR: 'controller',
    ACTN: 'action',
    PROJECT_CLAN: 'clan', // TODO不要
    TAB_TICKET: 'tabticket', // TODO不要
    ACTION1_LIST: 'list', // TODO不要
    ACTION2_TICKET: 'ticket', // TODO不要

    // Url Query Parameter
    QR_CLN_ID: 'clan_id',
    QR_PRJCT_ID: 'project_id',
    QR_TCKT_ID: 'ticket_id',

    // Controller Name
    CNTR_HOME: 'home',
    CNTR_CLN: 'clan',
    CNTR_PRJCT: 'project',

    // Action Name
    ACTN_HOME_DEF: 'index',
    ACTN_CLN_DEF: 'profile',
    ACTN_PRJCT_DEF: 'ticket',

    // quill
    QL_CH_USER: 'user',

    // システム値
    PROGRESS_MAX: 100,
    PROGRESS_MIN: 0,
    PROGRESS_LARGE: 10,
    PROGRESS_SMALL: 1,
};