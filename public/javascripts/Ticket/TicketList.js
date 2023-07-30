TicketList = function (svcLoc) {
    BaseAjax.call(this);
    this.svcLoc = svcLoc;
    this.beforeAction = false;
    this.svcLoc.factory('ticketUpdate', TicketUpdate);
    this.svcLoc.factory('ticketCreate', TicketCreate);
};

TicketList.prototype = Object.create(BaseAjax.prototype);
TicketList.prototype.constructor = TicketList;

TicketList.prototype.initialize = function (clanId, beforeAction) {
    this.clanId = clanId;
    this.projectId = this.svcLoc.get('project_id');
    this.myClanData = Routine.myClans[this.clanId];
    this.projectData = this.myClanData.projects[this.projectId];
    this.ticketsData = this.projectData.tickets;

    if (!beforeAction) {
        this.listener();
    }
}

TicketList.prototype.load = function () {
    this.list();
    this.show();

    var ticketId = this.svcLoc.get('ticket_id');

    this.updateAction = this.updateAction || this.svcLoc.get('ticketUpdate');
    this.updateAction.initialize(this.clanId, ticketId, this.beforeAction);
    this.updateAction.load();

    this.createAction = this.createAction || this.svcLoc.get('ticketCreate');
    this.createAction.initialize(this.clanId, this.beforeAction);

    this.beforeAction = true;

};

TicketList.prototype.show = function () {
    $('#ticket').show();
};

TicketList.prototype.listener = function () {
    var self = this;
    $('#ticket .listArea').resizable({
        maxWidth: Utils.getContentsWidth() * 0.7,
        minWidth: Utils.getContentsWidth() * 0.3,
        handles: 'e',
        resize: function (event, ui) {
            var ticketWidth = $('#ticket').width();
            var separateWidth = ticketWidth * 0.02;
            $('#ticket .showArea').width(ticketWidth - (ui.size.width + separateWidth));
        }
    });

    $('#createTicket .newTicket').on('click', function (e) {
        $(e.target).hide();
        $('#createTicket .error').hide();
        $('#createTicket .trackerDlg').show();
    });

    $('#createTicket .trackerDlg a').on('click', function (e) {
        self.selectTracker($(e.target).attr('sys_data'));
    });

    $(document).on('click', function (e) {
        self.newTicketInitializeHandler(e);
    });

    $('#createTicket .inputTitle input').on('blur', function (e) {
        var targetObj = $(e.target);
        var title = targetObj.val();
        if (title.length > 0) {
            targetObj.closest('section').hide();
            var Deferred = new $.Deferred();

            self.createAction.submit(targetObj.attr('sys_data'), Deferred);
            Deferred.promise().then(function () {
                self.reload();
            });
        }
    });
};

TicketList.prototype.list = function () {
    var self = this;
    var listArea = $('#ticket .list ul');
    listArea.empty();
    $.each(this.ticketsData, function (id, ticket) {
        if (!ticket) return true;
        var li = $('<li></li>', {
            sys_data: id,
            'class': 'ticket clearfix'
        });
        var user, tracker, title, status, shoulder, period;
        var img = $('<img />', {
            src: '/images/clan_prof_def_thumb.png'
        });
        var start, end, waveLine;
        var shoulderNm = ticket.shoulder_name ? ticket.shoulder_name : '';

        user = $('<p></p>', {
            'class': 'user'
        });
        tracker = $('<p></p>', {
            'class': 'tracker'
        });
        title = $('<p></p>', {
            'class': 'title'
        });
        status = $('<p></p>', {
            'class': 'status'
        });
        shoulder = $('<p></p>', {
            'class': 'shoulder'
        });
        period = $('<p></p>', {
            'class': 'period'
        });

        start = $('<span></span>', {
            'class': 'start'
        });
        end = $('<span></span>', {
            'class': 'end'
        });
        waveLine = $('<span></span>', {
            'class': 'waveLine'
        });
        start.text(Utils.getDate(ticket.start_date, 'm/d'));
        end.text(Utils.getDate(ticket.end_date, 'm/d'));
        waveLine.text('～');
        period.append(start, waveLine, end);

        user.append(img);
        tracker.text(Const.TRACKER_LIST[ticket.tracker]);
        status.text(Const.STATUS_LIST[ticket.tracker][ticket.status]);
        shoulder.text(shoulderNm);

        var a = $('<a></a>', {
            href: Utils.getTicketUrl(self.clanId, self.projectId, id)
        });
        switch (ticket.tracker + '') {
            case Const.MATCH:
                a.text(ticket.fight_tickets.opponent_name);
                break;
            case Const.WORK:
                a.text(ticket.work_tickets.title);
                break;
            case Const.NOTIFICATION:
                a.text(ticket.notification_tickets.title);
                break;
        }
        title.append(a);

        li.append(user, tracker, status, shoulder, title, period);
        listArea.append(li);
    });
};

TicketList.prototype.newTicketInitializeHandler = function (e) {
    if (!$(e.target).closest('#createTicket .newTicket')[0]) {
        if ($('#createTicket .trackerDlg:visible')[0]) {
            this.hideTrackerDlg();
        } else if (!$(e.target).closest('#createTicket .trackerDlg .tracker a')[0] && !$(e.target).closest('#createTicket .inputTitle')[0]) {
            if ($('#createTicket .inputTitle:visible')[0]) {
                this.hideInputTitle();
            }
        }
    }
};

TicketList.prototype.hideTrackerDlg = function (e) {
    $('#createTicket .trackerDlg').hide();
    $('#createTicket a').show();
};

TicketList.prototype.hideInputTitle = function (e) {
    $('#createTicket .inputTitle').hide();
    $('#createTicket a').show();
};

TicketList.prototype.selectTracker = function (tracker) {
    var self = this;

    $('#createTicket .trackerDlg').hide();
    switch (tracker) {
        case '0':
            $('#createTicket a').show();
            $(Const.CREATE_MATCHING_DLG).dialog({
                modal: true,
                title: 'マッチングチケットを発行する',
                open: function (event, ui) {
                    $(".ui-dialog-titlebar-close").hide();
                    self.createAction.clearTpl();
                    if (!(self.myClanData.play_titles.length > 0)) {
                        self.createAction.noPlayTitles();
                    }
                },
                close: function (event, ui) {
                    self.reload();
                }
            });
            break;
        case '1':
            this.showInputTitle(tracker);
            break;
        case '2':
            this.showInputTitle(tracker);
            break;
    }
};

TicketList.prototype.showInputTitle = function (tracker) {
    var targetObj = $('#createTicket .inputTitle');
    var targetInput = targetObj.find('input');

    $(Const.TICKET + ' [name="insert_id"]').val('0');
    targetInput.val('');
    targetInput.attr('sys_data', tracker);
    targetObj.show();
    targetInput.focus();
};

TicketList.prototype.reload = function () {
    var insertId = $(Const.TICKET + ' [name="insert_id"]').val();
    if (insertId) {
        this.list();
        Utils.redirectTicketList(this.clanId, this.projectId, insertId);
    }
};