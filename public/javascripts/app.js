$(function () {

    // setInterval(function () {
    //     window.location.href = '/Mypages';
    // }, 1000 * 60);

    $('[name="request_url"]').val(location.hash);

    var csrf = $('input[name=_csrf]').val();
    var socketio = io(Utils.getHost() + '?tkn=' + csrf);
    // TODO サーバーエラー時の処理
    socketio.on('ioError', function (err) {
        console.log(err.message);
        console.log(err.stack);
    });
    socketio.on('error', function (err) {
        console.log(err);
    });
    socketio.on('update', function (message) {
        console.log(message);
    });

    // Routing配列を作成後APPモジュールを実効する
    $.when(Routine.selectRelatedClan(true))
        .done(function () {
            var objApp = new App();
        })
        .fail(function (err) {
            console.log(err);
            // TODO エラー処理
        });
});

function App() {
    this.compatible();
    this.initialize();
};

App.prototype.initialize = function () {
    var svcLoc = new ServiceLocator();
    var csrf = $('input[name=_csrf]').val();
    var hostName = Utils.getHost();
    var queryStr = '?tkn=' + csrf;

    // svcLoc.register('routineNsp', io(hostName + '/routine' + queryStr));
    svcLoc.register('clansNsp', io(hostName + '/clans' + queryStr));
    svcLoc.register('projectsNsp', io(hostName + '/projects' + queryStr));
    svcLoc.register('invitesNsp', io(hostName + '/invites' + queryStr));
    svcLoc.register('searchDataNsp', io(hostName + '/searchData' + queryStr));
    svcLoc.register('ticketsNsp', io(hostName + '/tickets' + queryStr));
    svcLoc.factory('objSearchData', SearchData);
    svcLoc.factory('sidebar', Sidebar);
    svcLoc.factory('homeController', HomeController);
    svcLoc.factory('clanController', ClanController);
    svcLoc.factory('projectController', ProjectController);
    svcLoc.factory('inviteController', InviteController);
    // svcLoc.factory('clanLoader', ClanLoader);
    // svcLoc.factory('ticketLoader', TicketLoader);
    // svcLoc.factory('invite', Invite);
    svcLoc.get('sidebar').initialize();
    // this.clan = svcLoc.get('clanLoader');
    // this.ticket = svcLoc.get('ticketLoader');
    // this.invite = svcLoc.get('invite');
    this.svcLoc = svcLoc;

    this.listener();
};

App.prototype.listener = function () {
    var self = this;

    $(window).hashchange(function (e) {
        self.routing(e);
    });
    $(window).hashchange();

};


App.prototype.routing = function (e) {
    try {
        var properties = {};
        var firstRequest = $('[name="first_request"]').val();

        if (firstRequest === '1') {
            this.isFirst = true;
            $('[name="first_request"]').val('0');
        } else {
            this.isFirst = false;
        }

        this.hash = location.hash.toLowerCase();
        this.queries = this.hash.slice(1).split(Const.SEPARATOR1);
        this.queries.forEach(function (query) {
            var words = query.split(Const.SEPARATOR2);
            properties[words[0]] = words[1];
        });

        this.svcLoc.register('auth_id', $('[name="auth_id"]').val());
        this.svcLoc.register(Const.CNTR, null);
        this.svcLoc.register(Const.ACTN, null);
        this.svcLoc.register(Const.QR_CLN_ID, null);
        this.svcLoc.register(Const.QR_PRJCT_ID, null);
        this.svcLoc.register(Const.QR_TCKT_ID, null);

        for (var key in properties) {
            this.svcLoc.register(key, properties[key]);
        }
        
        var controller = this.controller = this.svcLoc.get(Const.CNTR);
        var action = this.action = this.svcLoc.get(Const.ACTN);
        if (!controller || !action) {
            this.controller = Const.CNTR_HOME;
            this.action = Const.ACTN_HOME_DEF;
            this.svcLoc.register(Const.CNTR, Const.CNTR_HOME);
            this.svcLoc.register(Const.ACTN, Const.ACTN_HOME_DEF);
        }
        this.clanId = this.svcLoc.get(Const.QR_CLN_ID);
        this.projectId = this.svcLoc.get(Const.QR_PRJCT_ID);

        var activeSidebar = this.activateProject();

        if (this.clanId && !this.checkExistInMyClan(this.clanId)) {
            if (activeSidebar.hasClass('invite') & !this.isFirst) {
                // this.svcLoc.get('invite').initialize(this.clanId, activeSidebar.text(), this.authId);
                // this.svcLoc.get('invite').popup();
                this.controller = 'invite';
                this.action = 'popup';
            } else {
                Utils.redirectHome();
            }
        }
        this.loadController();
        this.loadAction();
    }
    catch (e) {
        console.log(e);
    }
};

App.prototype.loadController = function () {
    this.svcLoc.get(this.controller + 'Controller').initialize();
};

App.prototype.loadAction = function () {
    var cntrStr = this.controller + Utils.ucfirst(Const.CNTR);
    var cntr = this.svcLoc.get(cntrStr);
    var actnStr = this.action + Utils.ucfirst(Const.ACTN);
    if (cntr && typeof cntr[actnStr] == 'function') {
        cntr[actnStr]();
    }
};

App.prototype.activateProject = function () {
    $('.pageActive').removeClass('pageActive');
    var findActiveSidebar = function (idx, elem) {
        var queries = Utils.getQueryParams($(elem).attr('href'));

        var valid = true;
        valid = queries[Const.CNTR] === this.controller && queries[Const.ACTN] === this.action;
        if (valid && queries[Const.CNTR] === Const.CNTR_HOME) return elem;
        valid = this.clanId ? valid && queries[Const.QR_CLN_ID] === this.clanId : valid;
        valid = this.projectId ? valid && queries[Const.QR_PRJCT_ID] === this.projectId : valid;
        if (valid) return elem;
    };
    var activeSidebar = $('#sidebar').find('.clan a,.home a').map(findActiveSidebar.bind(this));
    activeSidebar.addClass('pageActive');

    this.svcLoc.register('activeSidebar', activeSidebar);
    return activeSidebar;
};

App.prototype.checkExistInMyClan = function (clanId) {
    return Routine.myClans[clanId] && Routine.myClans[clanId].profile.agreement === 1;
};

App.prototype.compatible = function () {
    if (typeof Object.assign != 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, "assign", {
            value: function assign(target, varArgs) { // .length of function is 2
                'use strict';
                if (target == null) { // TypeError if undefined or null
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var to = Object(target);

                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource != null) { // Skip over if undefined or null
                        for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            },
            writable: true,
            configurable: true
        });
    }
};