function ProjectController(svcLoc) {
    Controller.call(this);
    this.super = Controller.prototype;
    this.svcLoc = svcLoc;
    this.beforeAction = false;
    this.svcLoc.factory('ticketList', TicketList);
    this.tabName1 = 'tabs2';
};

ProjectController.prototype = Object.create(Controller.prototype);
ProjectController.prototype.constructor = ProjectController;

ProjectController.prototype.initialize = function () {
    this.action = this.svcLoc.get('action');
    this.clanId = this.svcLoc.get('clan_id');
    this.projectId = this.svcLoc.get('project_id');
    this.super.initialize.call(this);
};

ProjectController.prototype.ticketAction = function () {
    this.myClan = Routine.myClans[this.clanId];

    this.ticketListObj = this.ticketListObj || this.svcLoc.get('ticketList');
    this.ticketListObj.initialize(this.clanId, this.beforeAction);
    this.beforeAction = true;
    this.ticketListObj.load();
};

ProjectController.prototype.editTabsHash = function () {
    var self = this;
    $('#' + this.tabName1 + ' a').each(function (i, e) {
        var queries = Utils.getQueryParams($(e).attr('href'));
        queries[Const.QR_CLN_ID] = self.clanId;
        queries[Const.QR_PRJCT_ID] = self.projectId;

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
