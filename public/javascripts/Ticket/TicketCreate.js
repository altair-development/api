TicketCreate = function (svcLoc) {
    BaseAjax.call(this);
    this.svcLoc = svcLoc;
    this.objSearchData = svcLoc.get('objSearchData');
    this.nsp = svcLoc.get('ticketsNsp');
    this.quill = null;
};

TicketCreate.prototype = Object.create(BaseAjax.prototype);
TicketCreate.prototype.constructor = TicketCreate;

TicketCreate.prototype.initialize = function (clanId, beforeAction) {
    this.clanId = clanId;
    this.projectId = this.svcLoc.get('project_id');
    this.authId = $('[name="auth_id"]').val();
    this.authName = $('[name="auth_name"]').val();
    this.myClanData = Routine.myClans[this.clanId];
    this.projectData = this.myClanData.projects[this.projectId];
    this.ticketsData = this.projectData.tickets;

    if (!beforeAction) {
        this.objSearchArea = new SearchArea(Const.CREATE_MATCHING_DLG, this);
        this.quill = new Quill(Const.CREATE_MATCHING_DLG + ' .descriptionEditor', {
            theme: 'snow'
        });
        this.objLiveValidation = new LiveValidation();
        this.objTicketValidation = new TicketValidation();
        this.objFighTicketValidation = new FightTicketValidation();
        this.objWorkTicketValidation = new WorkTicketValidation();
        this.objNotificationTicketValidation = new NotificationTicketValidation();
        this.listener();
    }
}

TicketCreate.prototype.listener = function () {
    var self = this;

    $(Const.CREATE_MATCHING_DLG + " .datepick_start").datepicker({
        dateFormat: 'yy-mm-dd'
    });
    $(Const.CREATE_MATCHING_DLG + " .datepick_end").datepicker({
        dateFormat: 'yy-mm-dd'
    });
    $(Const.CREATE_MATCHING_DLG + " .datepick_limit").datepicker({
        dateFormat: 'yy-mm-dd'
    });

    this.objSearchArea.listen();

    $(Const.CREATE_MATCHING_DLG + ' .live li a').on('click', function (e) {
        var targetA = $(e.target);
        if (!targetA.hasClass('active')) {
            var liveUrlObj = $(Const.CREATE_MATCHING_DLG + ' .live_url');

            $(Const.CREATE_MATCHING_DLG + ' .live li a[class="active"]').removeClass('active');
            targetA.addClass('active');
            if (targetA.attr('sys_data') === Const.LIVE_YES) {
                liveUrlObj.show();
            } else {
                liveUrlObj.hide();
            }
        }
    });

    $(Const.CREATE_MATCHING_DLG + ' .status li a').on('click', function (e) {
        self.changeActive($(e.target).closest('a'), 'status');
    });

    $(document).on('click', Const.CREATE_MATCHING_DLG + ' .playTitle li a', function (e) {
        self.changeActive($(e.target).closest('a'), 'playTitle');
    });

    $(document).on('click', Const.CREATE_MATCHING_DLG + ' .shoulder li a', function (e) {
        self.changeActive($(e.target).closest('a'), 'shoulder');
    });

    $(Const.CREATE_MATCHING_DLG + ' .submit').on('click', function () {
        self.submit(Const.MATCH);
    });

    $(Const.CREATE_MATCHING_DLG + ' .cancel').on('click', function () {
        self.cancel($(Const.CREATE_MATCHING_DLG));
    });

    $(document).on('click', '.ui-widget-overlay', function () {
        var content = $(this).prev().find('.ui-dialog-content');
        if (content.attr('id') === Const.CREATE_MATCHING_DLG.slice(1)) {
            self.cancel(content);
        }
    });
}

TicketCreate.prototype.submit = function (tracker, callerDeferred) {
    var param = {
        clan_id: this.clanId,
        project_id: this.projectId,
        tracker: tracker
    };
    var errors = [];

    switch (tracker) {
        case Const.MATCH:
            var tplObj = $(Const.CREATE_MATCHING_DLG);
            var exClass = null;
            var exId = Const.CREATE_MATCHING_DLG.slice(1);
            var queueNum = this.loadStart(exClass, true, exId);
            var watchers = [];
            var entryMembers = [];
            var live = tplObj.find('.live li .active').attr('sys_data');
            var lives = {
                live: live,
                live_url: live === Const.LIVE_YES ? tplObj.find('[name="live_url"]').val() : ''
            };

            $(Const.CREATE_MATCHING_DLG + ' .submitArea .submit .text').hide();
            $(Const.CREATE_MATCHING_DLG + ' .watcher .searchAreaResult li').each(function (i, e) {
                watchers.push({
                    user_id: $(e).attr('sys_data')
                });
            });

            $(Const.CREATE_MATCHING_DLG + ' .entryMember .searchAreaResult li').each(function (i, e) {
                entryMembers.push({
                    user_id: $(e).attr('sys_data')
                });
            });

            Object.assign(param, {
                clan_id: this.clanId,
                watchers: watchers,
                start_date: tplObj.find('[name="start_date"]').val(),
                end_date: tplObj.find('[name="end_date"]').val(),
                limit_date: tplObj.find('[name="limit_date"]').val(),
                status: tplObj.find('.status li .active').attr('sys_data'),
                shoulder: tplObj.find('.shoulder li .active').attr('sys_data'),
                description: this.quill.container.firstChild.innerHTML,
                fight_tickets: {
                    play_title: tplObj.find('.playTitle li .active').attr('sys_data'),
                    opponent: tplObj.find('.opponent .searchAreaResult li').attr('sys_data')
                },
                entry_members: entryMembers,
                lives: [
                    lives
                ]
            });

            if (!param.fight_tickets.opponent) {
                errors.push('対戦相手を選択してください。');
            }
            errors = errors.concat(this.objLiveValidation.validate(lives));
            errors = errors.concat(this.objTicketValidation.validate(param));

            if (errors.length > 0) {
                $(Const.CREATE_MATCHING_DLG + ' .submitArea .submit .text').show();
                this.showError(errors, exClass, queueNum, exId);
                return;
            }
            break;
        case Const.WORK:
            var exId = 'createTicket';
            var exClass = null;
            var queueNum = this.loadStart(exClass, true, exId);
            Object.assign(param, {
                work_tickets: {
                    title: $('#createTicket .inputTitle input').val()
                }
            });
            errors = this.objWorkTicketValidation.validate(param.work_tickets);

            if (errors.length > 0) {
                this.showError(errors, exClass, queueNum, exId);
                $('#createTicket a').show();
                return;
            }
            break;
        case Const.NOTIFICATION:
            var exId = 'createTicket';
            var exClass = null;
            var queueNum = this.loadStart(exClass, true, exId);
            Object.assign(param, {
                notification_tickets: {
                    title: $('#createTicket .inputTitle input').val()
                }
            });
            errors = this.objNotificationTicketValidation.validate(param.notification_tickets);

            if (errors.length > 0) {
                this.showError(errors, exClass, queueNum, exId);
                $('#createTicket a').show();
                return;
            }
            break;
    }

    this.exId = exId;
    this.tracker = tracker;
    this.callerDeferred = callerDeferred ? callerDeferred : null;
    this.emit(exClass, 'create', param, this.updateDone, this.updateFail, true, queueNum);
}

TicketCreate.prototype.cancel = function (dlgObj) {
    dlgObj.dialog('close');
}

TicketCreate.prototype.updateDone = function (result, obj) {
    var self = obj || this;
    var ticket = result.ticket;
    var ticketId = Object.keys(ticket)[0];
    var clanId = result.clan_id;

    switch (ticket[ticketId].tracker + '') {
        case Const.MATCH:
            Routine.setTickets(clanId, self.projectId, ticketId, ticket[ticketId]);
            $(Const.TICKET + ' [name="insert_id"]').val(ticketId);
            $(Const.CREATE_MATCHING_DLG + ' .submitArea .submit .text').show();
            $(Const.CREATE_MATCHING_DLG).dialog('close');
            break;
        default:
            Routine.setTickets(clanId, self.projectId, ticketId, ticket[ticketId]);
            $(Const.TICKET + ' [name="insert_id"]').val(ticketId);
            $('#createTicket a').show();
            self.callerDeferred.resolve();
    }
}

TicketCreate.prototype.updateFail = function (result, obj) {
    var self = obj || this;

    switch (self.tracker) {
        case Const.MATCH:
            $(Const.CREATE_MATCHING_DLG + ' .submitArea .submit .text').show();
            break;
        default:
            $('#createTicket a').show();
            break;
    }
}

TicketCreate.prototype.changeActive = function (targetObj, className) {
    if (!targetObj.hasClass('active')) {
        $(Const.CREATE_MATCHING_DLG + ' .' + className + ' li a.active').removeClass('active');
        targetObj.addClass('active');
    }
}

TicketCreate.prototype.clearCommon = function (targetObj) {
    targetObj.find('[name="start_date"]').val('');
    targetObj.find('[name="end_date"]').val('');
    targetObj.find('[name="limit_date"]').val('');
    this.changeActive(targetObj.find('.status ul li a[sys_data="' + Const.MATCHING_NEW + '"]'), 'status');
    this.setShoulder();
}

TicketCreate.prototype.clearTpl = function () {
    var targetObj = $(Const.CREATE_MATCHING_DLG);

    $(Const.TICKET + ' [name="insert_id"]').val('0');
    targetObj.find('.error').hide();
    targetObj.find('.error ul').empty();
    targetObj.find('.submitArea .submit').prop('disabled', false);
    this.objSearchArea.clearOutputArea();
    this.clearCommon(targetObj);
    this.setPlayTitle();
    targetObj.find('.opponent .searchAreaResult ul').empty();
    this.quill.clipboard.dangerouslyPasteHTML('');
    $(':focus').blur();
    targetObj.find('.entryMember .searchAreaResult ul').empty();
    this.changeActive(targetObj.find('.live ul li a[sys_data="' + Const.LIVE_NO + '"]'), 'live');
    targetObj.find('.live_url').hide();
    targetObj.find('[name="live_url"]').val('');
    targetObj.find('.watcher .searchAreaResult ul').empty();
}

TicketCreate.prototype.noPlayTitles = function () {
    var targetObj = $(Const.CREATE_MATCHING_DLG);
    var errorObj = targetObj.find('.error');
    var errorUl = errorObj.find('ul');
    var li = $('<li></li>', {
        text: 'クランに登録済みのプレイタイトルが存在しないためチケットを発行できません。'
    });

    errorUl.append(li);
    errorObj.show();
    targetObj.find('.submitArea .submit').prop('disabled', true);
}

TicketCreate.prototype.setPlayTitle = function () {
    var listArea = $(Const.CREATE_MATCHING_DLG + ' .playTitle ul');
    listArea.empty();
    $.each(this.myClanData.play_titles, function (i, playTitle) {
        var li = $('<li></li>');
        var a = $('<a></a>', {
            sys_data: playTitle.title_id,
            text: playTitle.title_name,
            href: 'javascript:void(0);',
            'class': i === 0 ? 'active' : ''
        });

        li.append(a);
        listArea.append(li);
    });
}

TicketCreate.prototype.setShoulder = function () {
    var ul = $(Const.CREATE_MATCHING_DLG + ' .shoulder ul');

    ul.empty();
    ul.append(this.createUserLi(this.authId, this.authName, true));
}

TicketCreate.prototype.createUserLi = function (userId, userName, activeFlg) {
    var src = '/Users/getProfileImage?user=' + userId;
    var img = $('<img>', {
        src: src
    });
    var spanUserNm = $('<span></span>', {
        text: userName,
        'class': 'userNm'
    });
    var li = $('<li></li>');
    var a = $('<a></a>', {
        href: 'javascript:void(0)',
        sys_data: userId,
        'class': activeFlg ? 'active' : ''
    });
    var wrapper = $('<section></section>');
    var contentLeft = $('<section></section>', {
        'class': 'contentLeft'
    });
    var contentRight = $('<section></section>', {
        'class': 'contentRight'
    });

    contentLeft.append(img);
    wrapper.append(contentLeft);

    contentRight.append(spanUserNm);
    wrapper.append(contentRight);

    a.append(wrapper);
    li.append(a);

    return li;
}

TicketCreate.prototype.searchOpponent = function (searchStr) {
    var tmpClans = [];
    var resultArea = $(Const.CREATE_MATCHING_DLG + ' .opponent .searchAreaResult ul li');

    resultArea.each(function (i, e) {
        tmpClans.push($(e).attr('sys_data'));
    });
    tmpClans.push(this.clanId);

    this.objSearchData.searchOpponent(tmpClans, searchStr, this, function (err, matchData) {
        if (err) {
            // TODO エラー処理
        } else if (matchData.length > 0) {
            this.insertOpponent(matchData);
        } else {
            this.clearOpponent();
        }
    });
};

TicketCreate.prototype.clearOpponent = function () {
    this.objSearchArea.clearOutputArea();
};

TicketCreate.prototype.insertOpponent = function (data) {
    this.objSearchArea.clearOutputArea();
    this.objSearchArea.insertSearchOutput(data, 'opponent', true, true);
};

TicketCreate.prototype.updateOpponent = function (id, name, user_id, user_name) {
    this.objSearchArea.hideSearchArea('opponent', true);
    $(Const.CREATE_MATCHING_DLG + ' .opponent .searchAreaResult ul').empty();
    this.objSearchArea.insertResultArea('Opponent', name, id, true, true, true);

    var ul = $(Const.CREATE_MATCHING_DLG + ' .shoulder ul');
    var opponentLi = ul.find('li').eq(1);

    if (opponentLi) {
        if ($(opponentLi).find('a').hasClass('active')) {
            ul.find('li a:eq(0)').addClass('active');
        }
        opponentLi.remove();
    }
    ul.append(this.createUserLi(user_id, user_name, false));
};

TicketCreate.prototype.searchEntryMember = function (searchStr) {
    var members = this.myClanData.members;
    var resultList = [];
    var resultArea = $(Const.CREATE_MATCHING_DLG + ' .entryMember .searchAreaResult ul li');

    resultArea.each(function (i, e) {
        resultList.push($(e).attr('sys_data'));
    });
    var matchData = [];

    $.each(members, function (key, member) {
        if ((member.agreement === Const.FLG_NO - 0) || resultList.indexOf(String(member.user_id)) >= 0) return;
        if (member.user_name.indexOf(searchStr) === 0) {
            matchData.push({ id: member.user_id, name: member.user_name });
        }
    });

    if (matchData.length > 0) {
        this.insertMember('entryMember', matchData);
    } else {
        this.clearEntryMember();
    }
};

TicketCreate.prototype.clearEntryMember = function () {
    this.objSearchArea.clearOutputArea();
};

TicketCreate.prototype.insertMember = function (className, data) {
    this.objSearchArea.clearOutputArea();
    this.objSearchArea.insertSearchOutput(data, className, true);
};

TicketCreate.prototype.updateEntryMember = function (id, name) {
    this.objSearchArea.hideSearchArea('entryMember', true);
    this.objSearchArea.insertResultArea('EntryMember', name, id, true);
};

TicketCreate.prototype.deleteEntryMember = function (id) {
    this.objSearchArea.deleteResultOne('EntryMember', id);
};

TicketCreate.prototype.searchWatcher = function (searchStr) {
    var members = this.myClanData.members;
    var resultList = [];
    var resultArea = $(Const.CREATE_MATCHING_DLG + ' .watcher .searchAreaResult ul li');

    resultArea.each(function (i, e) {
        resultList.push($(e).attr('sys_data'));
    });
    var matchData = [];

    $.each(members, function (key, member) {
        if ((member.agreement === Const.FLG_NO - 0) || (resultList.indexOf(String(member.user_id)) >= 0)) return;

        if (member.user_name.indexOf(searchStr) === 0) {
            matchData.push({ id: member.user_id, name: member.user_name });
        }
    });

    if (matchData.length > 0) {
        this.insertMember('watcher', matchData);
    } else {
        this.clearWatcher();
    }
};

TicketCreate.prototype.clearWatcher = function () {
    this.objSearchArea.clearOutputArea();
};

TicketCreate.prototype.updateWatcher = function (id, name) {
    this.objSearchArea.hideSearchArea('watcher', true);
    this.objSearchArea.insertResultArea('Watcher', name, id, true);
};

TicketCreate.prototype.deleteWatcher = function (id) {
    this.objSearchArea.deleteResultOne('Watcher', id);
};
