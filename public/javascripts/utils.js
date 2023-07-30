var Utils = {
    ucfirst: function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    lcfirst: function (str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    },
    lcRemoveSp: function (str) {
        str = this.toHalfZenkana(this.toHalfWidth(str));
        return str.replace(/\s+/g, "").toLowerCase();
    },
    // アルファベット・数字を半角に変換
    toHalfWidth: function (str) {
        return str.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
    },
    // 全角カタカナを半角に変換
    toHalfZenkana: function (str) {
        var beforeStr = new Array('ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ャ', 'ュ', 'ョ', 'ッ', 'ー', 'ヴ', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド', 'バ', 'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ', 'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ヲ', 'ン');
        var afterStr = new Array('ｧ', 'ｨ', 'ｩ', 'ｪ', 'ｫ', 'ｬ', 'ｭ', 'ｮ', 'ｯ', 'ｰ', 'ｳﾞ', 'ｶﾞ', 'ｷﾞ', 'ｸﾞ', 'ｹﾞ', 'ｺﾞ', 'ｻﾞ', 'ｼﾞ', 'ｽﾞ', 'ｾﾞ', 'ｿﾞ', 'ﾀﾞ', 'ﾁﾞ', 'ﾂﾞ', 'ﾃﾞ', 'ﾄﾞ', 'ﾊﾞ', 'ﾋﾞ', 'ﾌﾞ', 'ﾍﾞ', 'ﾎﾞ', 'ﾊﾟ', 'ﾋﾟ', 'ﾌﾟ', 'ﾍﾟ', 'ﾎﾟ', 'ｱ', 'ｲ', 'ｳ', 'ｴ', 'ｵ', 'ｶ', 'ｷ', 'ｸ', 'ｹ', 'ｺ', 'ｻ', 'ｼ', 'ｽ', 'ｾ', 'ｿ', 'ﾀ', 'ﾁ', 'ﾂ', 'ﾃ', 'ﾄ', 'ﾅ', 'ﾆ', 'ﾇ', 'ﾈ', 'ﾉ', 'ﾊ', 'ﾋ', 'ﾌ', 'ﾍ', 'ﾎ', 'ﾏ', 'ﾐ', 'ﾑ', 'ﾒ', 'ﾓ', 'ﾔ', 'ﾕ', 'ﾖ', 'ﾗ', 'ﾘ', 'ﾙ', 'ﾚ', 'ﾛ', 'ﾜ', 'ｦ', 'ﾝ');
        for (var i = 0; i < beforeStr.length; i++) {
            str = str.replace(new RegExp(beforeStr[i], 'g'), afterStr[i]);
        }
        return str;
    },
    getContentsWidth: function () {
        var windowWidth = $(window).width();
        var containerPadding = windowWidth * 0.02;
        var sidebarWidth = 200;
        return windowWidth - (sidebarWidth + containerPadding);
    },
    getDate: function (dt_string, format) {
        if (dt_string) {
            if (dt_string === Const.DATE_BLANK) {
                var y = '0000';
                var m = d = h = i = s = '00';
            } else {
                var dt = new Date(dt_string);
                var y = dt.getFullYear();
                var m = ('00' + (dt.getMonth() + 1)).slice(-2);
                var d = ('00' + dt.getDate()).slice(-2);
                var h = ('00' + dt.getHours()).slice(-2);
                var i = ('00' + dt.getMinutes()).slice(-2);
                var s = ('00' + dt.getSeconds()).slice(-2);
            }
        } else {
            var y = '0000';
            var m = '00';
            var d = '00';
            var h = '00';
            var i = '00';
            var s = '00';
        }

        return format.replace(/y/, y)
            .replace(/m/, m)
            .replace(/d/, d)
            .replace(/h/, h)
            .replace(/i/, i)
            .replace(/s/, s);
    },
    getHost: function () {
        return location.protocol + '//' + location.host;
    },
    getQueryParams: function (hash) {
        var queryStrs = this.expandHashQuery(hash);
        var queries = {};
        queryStrs.forEach(function (str) {
            var words = str.split(Const.SEPARATOR2);
            queries[words[0]] = words[1];
        });
        return queries;
    },
    expandHashQuery: function (hash) {
        hash = hash.indexOf('#') == 0 ? hash.slice(1) : hash;
        return hash.split(Const.SEPARATOR1);
    },
    redirectHome: function () {
        location.href = '/Mypages/index';
    },
    redirectProjectList: function (clanId, projectId) {
        var url = this.getProjectUrl(clanId, projectId);
        location.href = url;
    },
    redirectTicketList: function (clanId, projectId, ticketId) {
        var url = this.getTicketUrl(clanId, projectId, ticketId);
        location.href = url;
    },
    getImageUrl: function (name) {
        return '/images/' + name;
    },
    getTicketUrl: function (clanId, projectId, ticketId) {
        var url = [
            '#' + Const.CNTR + Const.SEPARATOR2 + Const.CNTR_PRJCT,
            Const.ACTN + Const.SEPARATOR2 + Const.ACTN_PRJCT_DEF,
            Const.QR_CLN_ID + Const.SEPARATOR2 + clanId,
            Const.QR_PRJCT_ID + Const.SEPARATOR2 + projectId
        ];
        if (ticketId) url.push(Const.QR_TCKT_ID + Const.SEPARATOR2 + ticketId);
        return url.join(Const.SEPARATOR1);
    },
    getClanUrl: function (clanId) {
        return [
            '#' + Const.CNTR + Const.SEPARATOR2 + Const.CNTR_CLN,
            Const.ACTN + Const.SEPARATOR2 + Const.ACTN_CLN_DEF,
            Const.QR_CLN_ID + Const.SEPARATOR2 + clanId
        ].join(Const.SEPARATOR1);
    },
    getProjectUrl: function (clanId, projectId) {
        return [
            '#' + Const.CNTR + Const.SEPARATOR2 + Const.CNTR_PRJCT,
            Const.ACTN + Const.SEPARATOR2 + Const.ACTN_PRJCT_DEF,
            Const.QR_CLN_ID + Const.SEPARATOR2 + clanId,
            Const.QR_PRJCT_ID + Const.SEPARATOR2 + projectId
        ].join(Const.SEPARATOR1);
    },
};