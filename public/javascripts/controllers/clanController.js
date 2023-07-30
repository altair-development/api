function ClanController(svcLoc) {
    Controller.call(this);
    this.super = Controller.prototype;
    this.svcLoc = svcLoc;
    this.ownerProgress = false;
    this.notOwnerProgress = false;
    this.svcLoc.factory('clanProfile', ClanProfile);
    this.tabName1 = 'tabs1';
};

ClanController.prototype = Object.create(Controller.prototype);
ClanController.prototype.constructor = ClanController;

ClanController.prototype.initialize = function () {
    this.activeSidebar = this.svcLoc.get('activeSidebar');
    this.isOwner = this.activeSidebar.attr('is_owner') === 'true';
    this.action = this.svcLoc.get('action');
    this.id = this.svcLoc.get('clan_id');
    this.super.initialize.call(this);
    this.loadTab(this.svcLoc.get('action'));
};

ClanController.prototype.setOwnerProgress = function () {
    if (this.isOwner) {
        this.ownerProgress = true;
    } else {
        this.notOwnerProgress = true;
    }
};

ClanController.prototype.profileAction = function () {
    this.clanProfileObj = this.clanProfileObj || this.svcLoc.get('clanProfile');
    this.clanProfileObj.initialize(this.isOwner, {
        ownerProgress: this.ownerProgress,
        notOwnerProgress: this.notOwnerProgress
    });
    this.clanProfileObj.load();
    this.setOwnerProgress(this.isOwner);
    this.editNastedTabsHash(this.id);
};

ClanController.prototype.loadTab = function (tab) {
    $('.clanActive').removeClass('clanActive');
    $('#clanTabs a[tab="' + tab + '"]').addClass('clanActive');
};

ClanController.prototype.editTabsHash = function () {
    var self = this;
    $('#' + this.tabName1 + ' a').each(function (i, e) {
        var queries = Utils.getQueryParams($(e).attr('href'));
        queries[Const.QR_CLN_ID] = self.id;

        var hash = '#';
        var i = 0;
        for (var key in queries) {
            if (i !== 0) hash += Const.SEPARATOR1;
            hash += key + Const.SEPARATOR2 + queries[key];
            i++;
        }

        $(e).attr('href', hash);
    });
};

ClanController.prototype.editNastedTabsHash = function (clan_id) {
    var self = this;
    var separator = '&';

    $('#clanTabs a').each(function (i, e) {
        var params = $(e).attr('href').split(separator);
        params[0] = '#clan' + clan_id;
        var hash = params.join(separator);
        $(e).attr('href', hash);
    });
};

