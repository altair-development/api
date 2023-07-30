TicketUpdate = function (svcLoc) {
    BaseAjax.call(this);
    this.nsp = svcLoc.get('ticketsNsp');
    this.svcLoc = svcLoc;
    this.qlMatchObj = null;
    this.quillChange = false;
    this.progressRateChange = false;
    this.isOpponent = false;
};

TicketUpdate.prototype = Object.create(BaseAjax.prototype);
TicketUpdate.prototype.constructor = TicketUpdate;

TicketUpdate.prototype.initialize = function (clanId, ticketId, beforeAction) {
    this.clanId = clanId;
    this.projectId = this.svcLoc.get('project_id');
    this.ticketId = ticketId;
    this.myClanData = Routine.myClans[this.clanId];
    this.projectData = this.myClanData.projects[this.projectId];
    this.ticketsData = this.projectData.tickets;

    if (!beforeAction) {
        this.objSearchArea = new SearchArea(Const.UPDATE_TICKET_TPL, this);
        this.objSearchAreaWatcher = new SearchArea('#ticketWatcherDlg', this);
        this.qlMatchObj = new Quill(Const.UPDATE_MATCHING_TPL + ' .descriptionEditor', {
            theme: 'snow'
        });
        this.qlWorkObj = new Quill(Const.UPDATE_WORKING_TPL + ' .descriptionEditor', {
            theme: 'snow'
        });
        this.qlNotificationObj = new Quill(Const.UPDATE_NOTIFICATION_TPL + ' .descriptionEditor', {
            theme: 'snow'
        });
        this.objLiveValidation = new LiveValidation();
        this.objTicketValidation = new TicketValidation();
        this.objFighTicketValidation = new FightTicketValidation();
        this.objWorkTicketValidation = new WorkTicketValidation();
        this.objNotificationValidation = new NotificationTicketValidation();
        this.listener();
    }
}

TicketUpdate.prototype.load = function () {
    var tickets = this.ticketsData;
    if (tickets && Object.keys(tickets).length > 0) {
        if (!this.ticketId) {
            this.ticketId = Object.keys(tickets)[0];
        }
        if (!tickets[this.ticketId]) {
            Utils.redirectTicketList(this.clanId, this.projectId);
            return;
        }
        var params = {
            'id': this.ticketId,
            'tracker': tickets[this.ticketId].tracker
        };
        this.clearTpl(tickets[this.ticketId].tracker);
        this.setTemplate(params);
    } else if (this.ticketId) {
        Utils.redirectTicketList(this.clanId, this.projectId);
    } else {
        $(Const.UPDATE_TICKET_TPL).hide();
    }
};

TicketUpdate.prototype.listener = function () {
    var self = this;

    $(Const.UPDATE_TICKET_TPL + " .datepick_start").datepicker({
        dateFormat: 'yy-mm-dd',
        onSelect: function (dateText, inst) {
            $(this).closest('.stepContent').find('[name="start_date"]').val(dateText);
        }
    });
    $(Const.UPDATE_TICKET_TPL + " .datepick_end").datepicker({
        dateFormat: 'yy-mm-dd',
        onSelect: function (dateText, inst) {
            $(this).closest('.stepContent').find('[name="end_date"]').val(dateText);
        }
    });
    $(Const.UPDATE_TICKET_TPL + " .datepick_limit").datepicker({
        dateFormat: 'yy-mm-dd',
        onSelect: function (dateText, inst) {
            $(this).closest('.limitDate').find('.date').text(dateText);
        }
    });

    this.objSearchArea.listen();
    this.objSearchAreaWatcher.listen();

    $(Const.UPDATE_TICKET_TPL + ' .toggle').on('click', function (e) {
        var stepContent = $(e.target).closest('.toggle').siblings('.stepContent');
        var visibleObj = $('.stepContent:visible');
        if (visibleObj[0]) {
            if (stepContent.is(':visible')) {
                self.toggleClose(stepContent);
            } else {
                self.toggleClose(visibleObj);
                self.toggleOpen(stepContent);
            }
        } else {
            self.toggleOpen(stepContent);
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' header .menu .reader').on('click', function () {
        $(Const.UPDATE_TICKET_TPL + ':visible').find('header .menu .list').toggle();
    });

    $(document).on('click', function (e) {
        var visibleProgress = $(Const.UPDATE_TICKET_TPL).find('.progressRate .inputArea:visible');
        if (self.progressRateChange) {
            if (['up1', 'up10', 'down1', 'down10'].indexOf($(e.target).attr('class')) === -1) {
                self.progressRateChange = false;
                self.updateProgressRate();
                return;
            }
        } else if (!$(e.target).closest('.disp')[0] && visibleProgress[0]) {
            visibleProgress.hide();
            visibleProgress.siblings('.disp').show();
        }
        var visibleMenu = $(Const.UPDATE_TICKET_TPL).find('header .menu .list:visible');
        var visibleStep = $(Const.UPDATE_TICKET_TPL).find('.stepContent:visible');
        if (visibleMenu[0]) {
            var targetObj = $(visibleMenu).closest('.menu');

            if (!(visibleMenu[0] === $(e.target).closest('.list')[0]) &&
                !(targetObj.find('.reader')[0] === $(e.target).closest('.menu').find('.reader')[0])
            ) {
                visibleMenu.hide();
            }
        }
        if (visibleStep[0]) {
            var targetObj = $(visibleStep).closest('.step');
            if (!$(e.target).closest('.ui-datepicker-header')[0] &&
                !($(e.target).parents('.outputLi')[0]) &&
                !(visibleStep[0] === $(e.target).parents('.stepContent')[0]) &&
                !(targetObj.find('.toggle')[0] === $(e.target).parents('.step').find('.toggle')[0])
            ) {
                self.toggleClose(visibleStep);
            }
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' header .menu .editWatcher').on('click', function (e) {
        $(e.target).closest('.list').hide();
        $('#ticketWatcherDlg').dialog({
            modal: true,
        });
    });

    $(document).on('click', '.ui-widget-overlay', function () {
        var content = $(this).prev().find('.ui-dialog-content');
        if (content.attr('id') === 'ticketResultDlg') {
            self.closeResultDlg(content);
        } else {
            content.dialog('close');
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' [name="status"]').on('change', function (e) {
        self.updateStatus($(e.target).val());
    });

    $(document).on('click', Const.UPDATE_MATCHING_TPL + ' .playTitle ul li a', function (e) {
        $(Const.UPDATE_MATCHING_TPL + ' .playTitle .stepContent').hide();
        self.updatePlaytitle($(e.target).attr('sys_data'));
    });

    this.qlMatchObj.on('text-change', function (delta, oldDelta, source) {
        if (source === Const.QL_CH_USER) {
            self.quillChange = true;
        }
    });

    this.qlWorkObj.on('text-change', function (delta, oldDelta, source) {
        if (source === Const.QL_CH_USER) {
            self.quillChange = true;
        }
    });

    this.qlNotificationObj.on('text-change', function (delta, oldDelta, source) {
        if (source === Const.QL_CH_USER) {
            self.quillChange = true;
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' .ql-editor').on('blur', function (e) {
        if (self.quillChange) {
            self.quillChange = false;
            self.updateDescription();
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' .ql-toolbar').mousedown(function (e) {
        e.preventDefault();
    });

    $(Const.UPDATE_MATCHING_TPL + ' .live .selection li a').on('click', function (e) {
        var targetA = $(e.target);
        if (!targetA.hasClass('active')) {
            var liveUrlObj = $(Const.UPDATE_MATCHING_TPL + ' .live [name="live_url"]');

            $(Const.UPDATE_MATCHING_TPL + ' .live .selection li a[class="active"]').removeClass('active');
            targetA.addClass('active');
            if (targetA.attr('sys_data') === Const.LIVE_YES) {
                liveUrlObj.show();
            } else {
                liveUrlObj.hide();
            }
        }
    });

    $('#ticketResultDlg [name="result"]').on('change', function (e) {
        var result = $(e.target).val();

        if (result === '0') {
            $('#ticketResultDlg .winner').show();
        } else {
            $('#ticketResultDlg .winner').hide();
        }
    });

    $('.submitArea .update').on('click', function (e) {
        var targetClass = $(e.target).closest('.submitArea').attr('sys_data');
        switch (targetClass) {
            case 'period':
                self.updatePeriod();
                break;
            case 'live':
                self.updateLive();
                break;
        }
    });

    $('.submitArea .cancel').on('click', function (e) {
        var targetClass = $(e.target).closest('.submitArea').attr('sys_data');
        $(e.target).closest('.stepContent').hide();
    });

    $(Const.UPDATE_TICKET_TPL + ' .progressRate .up1').on('click', function (e) {
        var targetObj = $(Const.UPDATE_TICKET_TPL + ' .progressRate [name="progress_rate"]');
        var num = targetObj.val() - 0;

        if (num < Const.PROGRESS_MAX) {
            self.progressRateChange = !self.progressRateChange ? true : self.progressRateChange;
            targetObj.val(++num);
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' .progressRate .down1').on('click', function (e) {
        var targetObj = $(Const.UPDATE_TICKET_TPL + ' .progressRate [name="progress_rate"]');
        var num = targetObj.val() - 0;

        if (num > Const.PROGRESS_MIN) {
            self.progressRateChange = !self.progressRateChange ? true : self.progressRateChange;
            targetObj.val(--num);
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' .progressRate .up10').on('click', function (e) {
        var targetObj = $(Const.UPDATE_TICKET_TPL + ' .progressRate [name="progress_rate"]');
        var num = targetObj.val() - 0;

        if (num < Const.PROGRESS_MAX) {
            self.progressRateChange = !self.progressRateChange ? true : self.progressRateChange;
            if (num < (Const.PROGRESS_MAX - Const.PROGRESS_LARGE + 1)) {
                targetObj.val(num + Const.PROGRESS_LARGE);
            } else {
                targetObj.val(Const.PROGRESS_MAX);
            }
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' .progressRate .down10').on('click', function (e) {
        var targetObj = $(Const.UPDATE_TICKET_TPL + ' .progressRate [name="progress_rate"]');
        var num = targetObj.val() - 0;

        if (num > Const.PROGRESS_MIN) {
            self.progressRateChange = !self.progressRateChange ? true : self.progressRateChange;
            if (num < Const.PROGRESS_LARGE) {
                targetObj.val(Const.PROGRESS_MIN);
            } else {
                targetObj.val(num - Const.PROGRESS_LARGE);
            }
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' .progressRate .disp').on('click', function (e) {
        var targetObj = $(e.target).closest('.disp');
        targetObj.hide();
        self.showInputProgress(targetObj.find('.num').text());
    });

    $(Const.UPDATE_TICKET_TPL + ' [name="title"]').on({
        'keypress': function (e) {
            if (e.key == 'Enter') {
                $(e.target).blur();
                return false;
            }
        },
        'blur': function (e) {
            self.updateTitleListener(e);
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' [name="title"]').on('input', function (evt) {
        if (evt.target.scrollHeight > evt.target.offsetHeight) {
            $(evt.target).height(evt.target.scrollHeight);
        } else {
            var lineHeight = Number($(evt.target).css("lineHeight").split("px")[0]);
            while (true) {
                $(evt.target).height($(evt.target).height() - lineHeight);
                var scrollHeight = evt.target.scrollHeight < lineHeight ? lineHeight : evt.target.scrollHeight;
                if (scrollHeight > evt.target.offsetHeight) {
                    $(evt.target).height(scrollHeight);
                    break;
                }
            }
        }
    });

    $(Const.UPDATE_TICKET_TPL + ' .title [name="title"]').hover(
        function (e) {
            $(e.target).addClass('edit');
        },
        function (e) {
            $(e.target).removeClass('edit');
        }
    );
}

TicketUpdate.prototype.updateTitleListener = function (e) {
    var tplObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    var tracker = tplObj.find('[name="tracker"]').val();
    var title = $(e.target).val();

    if (tracker === Const.WORK) {
        if (title !== this.ticketsData[this.ticketId].work_tickets.title) {
            this.updateTitle(tracker, title);
        }
    } else if (tracker === Const.NOTIFICATION) {
        if (title !== this.ticketsData[this.ticketId].notification_tickets.title) {
            this.updateTitle(tracker, title);
        }
    }
}

TicketUpdate.prototype.showInputProgress = function (progressRate) {
    var targetObj = $(Const.UPDATE_TICKET_TPL + ':visible .progressRate .inputArea');

    targetObj.find('[name="progress_rate"]').val(progressRate);
    targetObj.show();
}

TicketUpdate.prototype.setPlayTitle = function (stepObj) {
    var titleId = $(Const.UPDATE_MATCHING_TPL + ' .playTitle .title').attr('sys_data');
    var listArea = $(Const.UPDATE_MATCHING_TPL + ' .playTitle ul');
    listArea.empty();
    $.each(this.myClanData.play_titles, function (i, playTitle) {
        if (playTitle.title_id + '' === titleId) {
            return;
        }
        var li = $('<li></li>');
        var a = $('<a></a>', {
            sys_data: playTitle.title_id,
            text: playTitle.title_name,
            href: 'javascript:void(0);'
        });

        li.append(a);
        listArea.append(li);
    });
    if (listArea.find('li').length === 0) {
        var li = $('<li></li>', {
            'class': 'noTitle',
            text: 'プレイタイトルの候補が存在しません。'
        });
        listArea.append(li);
    }

    stepObj.show();
}

TicketUpdate.prototype.clearTpl = function (tracker) {
    var targetObj = '';
    var errorObj = $(Const.UPDATE_TICKET_TPL + " .error:visible");
    
    errorObj.each(function (i, e) {
        $(e).hide();
    });

    $(Const.UPDATE_TICKET_TPL).hide();
    switch (tracker + '') {
        case Const.MATCH:
            var objTicketResult = $('#' + Const.TICKET_RESULT_DLG);

            targetObj = $(Const.UPDATE_MATCHING_TPL);
            this.clearCommon(targetObj, tracker);
            targetObj.find('.playTitle .title').attr('sys_data', '');
            targetObj.find('.playTitle .title').text('');
            targetObj.find('.opponent .prof .img .profImg').remove();
            targetObj.find('.opponent .prof .name .clan').text('');
            targetObj.find('.opponent .prof .name .user').text('');
            targetObj.find('.entryMember .searchAreaResult ul').empty();
            targetObj.find('.live [name="live_url"]').val('');
            objTicketResult.find('label[for="winner-1"]').empty();
            objTicketResult.find('label[for="winner-2"]').empty();
            break;
        case Const.WORK:
            targetObj = $(Const.UPDATE_WORKING_TPL);
            this.clearCommon(targetObj, tracker);
            targetObj.find('.title [name="title"]').text('');
            targetObj.find('.progressRate .num').text('');
            targetObj.find('[name="progress_rate"]').val('');
            break;
        case Const.NOTIFICATION:
            targetObj = $(Const.UPDATE_NOTIFICATION_TPL);
            this.clearCommon(targetObj, tracker);
            targetObj.find('.title [name="title"]').text('');
            break;
    }
}

TicketUpdate.prototype.clearCommon = function (targetObj, tracker) {
    targetObj.find('.success, .fail').hide();
    $('#ticketWatcherDlg .watcher .searchAreaResult ul').empty();
    targetObj.find('.startDate').text('');
    targetObj.find('.endDate').text('');
    targetObj.find('.limitDate .date').text('');
    targetObj.find('.status [name="status"]').val('');
    targetObj.find('.shoulder .searchAreaResult ul').empty();
    targetObj.find('.shoulder .user').empty();
    targetObj.find('.history ul').empty();
    switch (tracker + '') {
        case Const.MATCH:
            this.qlMatchObj.clipboard.dangerouslyPasteHTML('');
            targetObj.find('.description iframe').attr('src', '');
            break;
        case Const.WORK:
            this.qlWorkObj.clipboard.dangerouslyPasteHTML('');
            break;
        case Const.NOTIFICATION:
            this.qlNotificationObj.clipboard.dangerouslyPasteHTML('');
            break;
    }
}

TicketUpdate.prototype.updatePlaytitle = function (titleId) {
    var param = {
        fight_tickets: {
            play_title: titleId
        }
    };

    this.update('playTitle', param, this.setResultPlayTitle, null, 'update');
}

TicketUpdate.prototype.setResultPlayTitle = function (result, obj) {
    var ticketHistory = result;
    var fightTickets = ticketHistory.fight_tickets;

    $(Const.UPDATE_MATCHING_TPL + ' .playTitle .title').attr('sys_data', fightTickets.play_title_id);
    $(Const.UPDATE_MATCHING_TPL + ' .playTitle .title').text(fightTickets.play_title_name);
    obj.updateRoutine(result, obj);
}

TicketUpdate.prototype.updateStatus = function (status) {
    var self = this;
    var param = {
        status: status
    };

    if (status === Const.MATCHING_END) {
        $('#ticketResultDlg').dialog({
            modal: true,
            title: "試合結果を入力する",
            buttons: {
                '更新': function () { self.updateResult(this); },
                'キャンセル': function () { self.closeResultDlg(this); }
            },
            open: function (event, ui) {
                $(".ui-dialog-titlebar-close").hide();
                self.clearTicketResult();
                self.setTicketResult(self.ticketsData[self.ticketId].fight_tickets);
            }
        });
    } else {
        this.update('status', param, this.updateRoutine, this.undoStatus, 'update');
    }
}

TicketUpdate.prototype.updateResult = function (dlgObj) {
    if ($('#ticketResultDlg [name="result"]:checked').val() === '0') {
        var opponent = this.ticketsData[this.ticketId].fight_tickets.opponent_id;
        var clanId =  this.ticketsData[this.ticketId].clan_id;
        var winner = $('#ticketResultDlg [name="winner"]:checked').val();
        var loser = winner === clanId ? opponent : clanId;
        var fight_tickets = {
            winner: winner,
            loser: loser,
            draw: Const.DRAW_NO
        };
    } else {
        var fight_tickets = {
            winner: null,
            loser: null,
            draw: Const.DRAW_YES
        };
    }
    var tplObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    var param = {
        ticket_id: this.ticketId,
        clan_id: this.clanId,
        tracker: tplObj.find('[name="tracker"]').val(),
        status: Const.MATCHING_END,
        fight_tickets: fight_tickets
    };
    var objError = $('#' + Const.TICKET_RESULT_DLG + ' .error');
    var errors = this.objFighTicketValidation.validate(param.fight_tickets);

    objError.hide();
    objError.empty();
    if (errors.length > 0) {
        $.each(errors, function(idx, message){
            var li = $('<li></li>', {
                text: message
            });
            objError.append(li);
        });
        objError.show();
    } else {
        var exId = $(Const.UPDATE_TICKET_TPL + ':visible').attr('id');
        var exClass = 'status';
        var queueNum = this.loadStart(exClass, true);

        this.closeResultDlg(dlgObj, true);

        this.exId = exId;
        this.emit(exClass, 'update', param, this.updateRoutine, this.undoStatus, true, queueNum);
    }
}

TicketUpdate.prototype.setTicketResult = function (fightTicket) {
    var objTicketResult = $('#' + Const.TICKET_RESULT_DLG);

    if (fightTicket.winner_id) {
        objTicketResult.find('[name="result"][value="0"]').prop('checked', true).trigger('change');
        objTicketResult.find('[name="winner"]').val([fightTicket.winner_id]);
    } else if (fightTicket.draw > 0) {
        objTicketResult.find('[name="result"]').val(['1']);
    }
}

TicketUpdate.prototype.clearTicketResult = function () {
    var objTicketResult = $('#' + Const.TICKET_RESULT_DLG);

    objTicketResult.find('.error').hide();
    objTicketResult.find('.error').empty();
    objTicketResult.find('.winner').hide();
    objTicketResult.find('[name="result"]:checked').prop('checked', false);
    objTicketResult.find('[name="winner"]:checked').prop('checked', false);
}

TicketUpdate.prototype.closeResultDlg = function (dlgObj, update) {
    if (!update) {
        this.undoStatus();
    }
    if (dlgObj instanceof jQuery) {
        dlgObj.dialog('close');
    } else {
        $(dlgObj).dialog('close');
    }
}

TicketUpdate.prototype.undoStatus = function (result, obj) {
    var self = obj ? obj : this;
    var beforeStatus = self.ticketsData[self.ticketId].status;
    $(Const.UPDATE_TICKET_TPL + ':visible [name="status"]').val(beforeStatus);
}

TicketUpdate.prototype.toggleOpen = function (stepObj) {

    switch (stepObj.attr('step_id')) {
        case 'period':
            this.setUpdatePeriod(stepObj);
            break;
        case 'playTitle':
            this.setPlayTitle(stepObj);
            break;
        case 'live':
            this.setLive(stepObj);
            break;
        case 'entryMember':
        case 'limitDate':
        case 'shoulder':
            stepObj.show();
            break;
    }
}

TicketUpdate.prototype.toggleClose = function (stepObj) {
    switch (stepObj.attr('step_id')) {
        case 'limitDate':
            this.updateLimitDate(stepObj);
            break;
        case 'shoulder':
            this.insertShouder(stepObj);
            break;
        case 'period':
        case 'live':
        case 'entryMember':
        case 'playTitle':
            stepObj.hide();
            break;
    }
}

TicketUpdate.prototype.updateTitle = function (tracker, title) {
    var tplObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    var exClass = 'title';
    var exId = tplObj.attr('id');
    var queueNum = this.loadStart(exClass, true, exId);
    var param = {
        ticket_id: this.ticketId,
        clan_id: this.clanId,
        tracker: tracker
    };

    if (tracker === Const.WORK) {
        Object.assign(param, {
            work_tickets: {
                title: title
            }
        });
        var errors = this.objWorkTicketValidation.validate(param.work_tickets);
    } else if (tracker === Const.NOTIFICATION) {
        Object.assign(param, {
            notification_tickets: {
                title: title
            }
        });
        var errors = this.objNotificationValidation.validate(param.notification_tickets);
    }

    if (errors.length > 0) {
        this.showError(errors, exClass, queueNum, exId);
        this.undoTitle();
    } else {
        this.exId = exId;
        this.emit(exClass, 'update', param, this.updateRoutine, this.undoTitle, true, queueNum);
    }
}

TicketUpdate.prototype.updateProgressRate = function () {
    var targetObj = $(Const.UPDATE_TICKET_TPL + ':visible .progressRate');
    var progressRate = $(Const.UPDATE_TICKET_TPL + ':visible [name="progress_rate"]').val();
    var param = {
        work_tickets: {
            progress_rate: progressRate
        }
    };

    targetObj.find('.disp .num').text(progressRate);
    targetObj.find('.inputArea').hide();
    targetObj.find('.disp').show();
    this.update('progressRate', param, this.updateRoutine, this.undoProgressRate, 'update');
}

TicketUpdate.prototype.undoTitle = function (result, obj) {
    var self = obj ? obj : this;
    var targetObj = $(Const.UPDATE_TICKET_TPL + ':visible .title [name="title"]');
    var ticket = this.ticketsData[self.ticketId];
    var tracker = ticket.tracker;
    if (targetObj[0]) {
        switch (tracker + '') {
            case Const.WORK:
                targetObj.val(ticket.work_tickets.title);
                break;
            case Const.NOTIFICATION:
                targetObj.val(ticket.notification_tickets.title);
                break;
        }
    }
    targetObj.trigger('input');
}

TicketUpdate.prototype.undoProgressRate = function (result, obj) {
    var beforeRate = obj.ticketsData[obj.ticketId].work_tickets.progress_rate;

    $(Const.UPDATE_TICKET_TPL + ':visible .progressRate .num').text(beforeRate);
}

TicketUpdate.prototype.updatePeriod = function () {
    var tplObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    var stepObj = tplObj.find('.period .stepContent');
    var exClass = 'period';
    var exId = tplObj.attr('id');
    var queueNum = this.loadStart(exClass, true, exId);
    var startDate = stepObj.find('[name="start_date"]').val();
    var endDate = stepObj.find('[name="end_date"]').val();
    var param = {
        ticket_id: this.ticketId,
        clan_id: this.clanId,
        tracker: tplObj.find('[name="tracker"]').val(),
        start_date: startDate.length > 0 ? startDate : '',
        end_date: endDate.length > 0 ? endDate : ''
    };
    var errors = this.objTicketValidation.validate(param);

    if (errors.length > 0) {
        this.showError(errors, exClass, queueNum, exId);
    } else {
        this.exId = exId;
        this.emit(exClass, 'update', param, this.setDispPeriod, null, true, queueNum);
    }
}

TicketUpdate.prototype.update = function (exClass, param, successFunc, failFunk, action) {
    var tplObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    var upParam = {
        ticket_id: this.ticketId,
        clan_id: this.clanId,
        tracker: tplObj.find('[name="tracker"]').val()
    };
    action = action ? action : 'update';
    if (exClass === 'watcher') {
        var exId = 'ticketWatcherDlg';
    } else {
        var exId = $(Const.UPDATE_TICKET_TPL + ':visible').attr('id');
    }

    Object.assign(upParam, param);

    this.loadingEmit(exClass, action, upParam, successFunc, failFunk, true, exId);
}

TicketUpdate.prototype.setUpdatePeriod = function (stepObj) {
    var step = stepObj.closest('.step');
    var startDate = step.find('.startDate').text();
    var endDate = step.find('.endDate').text();
    var visibleTpl = $(Const.UPDATE_TICKET_TPL + ':visible');
    startDate = startDate.split('-').join('') > 0 ? startDate : '';
    endDate = endDate.split('-').join('') > 0 ? endDate : '';

    visibleTpl.find('[name="start_date"]').val(startDate);
    visibleTpl.find('.datepick_start').datepicker('setDate', startDate);
    visibleTpl.find('[name="end_date"]').val(endDate);
    visibleTpl.find('.datepick_end').datepicker('setDate', endDate);

    stepObj.find('.error').hide();
    stepObj.show();
}

TicketUpdate.prototype.setDispPeriod = function (result, obj) {
    var visibleObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    visibleObj.find('.period .startDate').text(Utils.getDate(result.start_date, 'y-m-d'));
    visibleObj.find('.period .endDate').text(Utils.getDate(result.end_date, 'y-m-d'));
    obj.updateRoutine(result, obj);
}

TicketUpdate.prototype.setTemplate = function (params) {
    var self = this;
    var ticket = this.ticketsData[params.id];

    switch (params.tracker + '') {
        case Const.MATCH:
            var fightTicket = ticket.fight_tickets;
            var myLive = ticket.lives[this.clanId];
            var targetObj = $(Const.UPDATE_MATCHING_TPL);
            this.isOpponent = fightTicket.opponent_id === this.clanId;

            this.setCommomTpl(targetObj, ticket);

            // 担当者
            targetObj.find('.shoulder .exist, .shoulder .notExist').hide();
            if (ticket.shoulder_id) {
                var img = $('<img>', {
                    src: '/Users/getProfileImage?user=' + ticket.shoulder_id
                });
                var spanUserNm = $('<span></span>', {
                    text: ticket.shoulder_name,
                    'class': 'userNm'
                });
                var li = this.createShoulderLi(ticket.shoulder_id, img, spanUserNm);
                targetObj.find('.shoulder .searchAreaResult ul').append(li);
                targetObj.find('.shoulder .user').append([img.clone(), spanUserNm.clone()]);
                targetObj.find('.shoulder .exist').show();
            } else {
                targetObj.find('.shoulder .notExist').show();
            }

            // 返信期日
            var limitDate = Utils.getDate(ticket.limit_date, 'y-m-d');
            targetObj.find('.limitDate .date').text(limitDate);
            targetObj.find('.datepick_limit').datepicker('setDate', limitDate);

            // プレイタイトル
            targetObj.find('.playTitle .title').attr('sys_data', fightTicket.play_title_id);
            if (fightTicket.play_title_name) {
                targetObj.find('.playTitle .title').text(fightTicket.play_title_name);
            } else {
                targetObj.find('.playTitle .title').text('不明なタイトル');
            }

            // 対戦相手
            var opponent_id = '';
            var opponent_name = '';
            var opponent_user_name = '';

            if (this.isOpponent) {
                opponent_id = ticket.clan_id;
                opponent_name = ticket.clan_name;
                opponent_user_name = ticket.clan_user_name;
            } else {
                opponent_id = fightTicket.opponent_id;
                opponent_name = fightTicket.opponent_name;
                opponent_user_name = fightTicket.opponent_user_name;
            }
            var img = $('<img>', {
                src: '/Clans/getProfileImage?clan=' + opponent_id,
                'class': 'profImg'
            });
            var opponentClan = {
                id: opponent_id,
                name: opponent_name,
                user_name: opponent_user_name
            };

            targetObj.find('.opponent .prof .img').append(img);
            targetObj.find('.opponent .prof .name .clan').text(opponentClan.name);
            targetObj.find('.opponent .prof .name .clan').attr('sys_data', opponent_id);
            targetObj.find('.opponent .prof .name .user').text(opponentClan.user_name);

            // 参加メンバー
            $.each(ticket.entry_members[this.clanId], function (idx, user) {
                var img = $('<img>', {
                    src: '/Users/getProfileImage?user=' + user.user_id
                });
                var spanUserNm = $('<span></span>', {
                    text: user.user_name,
                    'class': 'userNm'
                });

                var li = self.objSearchArea.createUserLi(user.user_id, img, spanUserNm);
                targetObj.find('.entryMember .searchAreaResult ul').append(li);
            });

            // 配信
            this.insertLive(myLive);

            // 勝者
            if (opponentClan) {
                var myClanPl = this.createClanNamePlate(this.clanId, this.myClanData.profile);
                $('#ticketResultDlg label[for="winner-1"]').append(myClanPl);
                $('#ticketResultDlg #winner-1').attr('value', this.clanId);

                var opponentClanPl = this.createClanNamePlate(opponent_id, opponentClan);
                $('#ticketResultDlg label[for="winner-2"]').append(opponentClanPl);
                $('#ticketResultDlg #winner-2').attr('value', opponent_id);

                this.setTicketResult(fightTicket);
            }
            break;
        case Const.WORK:
            var targetObj = $(Const.UPDATE_WORKING_TPL);
            var workTicket = ticket.work_tickets;

            this.setCommomTpl(targetObj, ticket);

            // 担当者
            targetObj.find('.shoulder .exist, .shoulder .notExist').hide();
            if (ticket.shoulder_id) {
                var img = $('<img>', {
                    src: '/Users/getProfileImage?user=' + ticket.shoulder_id
                });
                var spanUserNm = $('<span></span>', {
                    text: ticket.shoulder_name,
                    'class': 'userNm'
                });
                var li = this.createShoulderLi(ticket.shoulder_id, img, spanUserNm);
                targetObj.find('.shoulder .searchAreaResult ul').append(li);
                targetObj.find('.shoulder .user').append([img.clone(), spanUserNm.clone()]);
                targetObj.find('.shoulder .exist').show();
            } else {
                targetObj.find('.shoulder .notExist').show();
            }

            // 返信期日
            var limitDate = Utils.getDate(ticket.limit_date, 'y-m-d');
            targetObj.find('.limitDate .date').text(limitDate);
            targetObj.find('.datepick_limit').datepicker('setDate', limitDate);

            // タイトル
            targetObj.find('.title [name="title"]').val(workTicket.title);

            // 進捗率
            var progressRate = workTicket.progress_rate || 0 ? workTicket.progress_rate : 0;
            targetObj.find('.progressRate .disp .num').text(progressRate);

            break;
        case Const.NOTIFICATION:
            var targetObj = $(Const.UPDATE_NOTIFICATION_TPL);
            var notificationTicket = ticket.notification_tickets;

            this.setCommomTpl(targetObj, ticket);

            // タイトル
            targetObj.find('.title [name="title"]').val(notificationTicket.title);

            break;
    }

    // 履歴
    this.setAllHistory(ticket.ticket_histories, ticket.tracker);
    targetObj.show();
}

TicketUpdate.prototype.setCommomTpl = function (targetObj, ticket) {
    var self = this;

    // ステータス
    targetObj.find('.status [name="status"]').val(ticket.status);
    // 開始日
    targetObj.find('.startDate').text(Utils.getDate(ticket.start_date, 'y-m-d'));
    // 終了日
    targetObj.find('.endDate').text(Utils.getDate(ticket.end_date, 'y-m-d'));

    // 説明
    switch (ticket.tracker + '') {
        case Const.MATCH:
            if (this.isOpponent) {
                targetObj.find('.ql-toolbar').hide();
                targetObj.find('.descriptionEditor').hide();
                targetObj.find('.description iframe').attr('src', '/Tickets/getDescription?ticket=' + this.ticketId);
                targetObj.find('.description iframe').show();
                targetObj.find('.period .toggle').hide();
                targetObj.find('.playTitle .toggle').hide();
            } else {
                this.qlMatchObj.clipboard.dangerouslyPasteHTML(ticket.description);
                targetObj.find('.ql-toolbar').show();
                targetObj.find('.descriptionEditor').show();
                targetObj.find('.description iframe').hide();
                targetObj.find('.period .toggle').show();
                targetObj.find('.playTitle .toggle').show();
            }
            break;
        case Const.WORK:
            this.qlWorkObj.clipboard.dangerouslyPasteHTML(ticket.description);
            break;
        case Const.NOTIFICATION:
            this.qlNotificationObj.clipboard.dangerouslyPasteHTML(ticket.description);
            break;
    }
    $(':focus').blur();

    // ウォッチャー
    var visibleMenu = $(Const.UPDATE_TICKET_TPL).find('header .menu .list:visible');
    if (visibleMenu[0]) {
        visibleMenu.hide();
    }
    $.each(ticket.watchers[this.clanId], function (idx, user) {
        var img = $('<img>', {
            src: '/Users/getProfileImage?user=' + user.user_id
        });
        var spanUserNm = $('<span></span>', {
            text: user.user_name,
            'class': 'userNm'
        });

        var li = self.objSearchAreaWatcher.createUserLi(user.user_id, img, spanUserNm);
        $('#ticketWatcherDlg .watcher .searchAreaResult ul').append(li);
    });
};

TicketUpdate.prototype.setAllHistory = function (ticket_histories, tracker) {
    var self = this;
    switch (tracker + '') {
        case Const.MATCH:
            var historyArea = $(Const.UPDATE_MATCHING_TPL + ' .history ul');
            break;
        case Const.WORK:
            var historyArea = $(Const.UPDATE_WORKING_TPL + ' .history ul');
            break;
        case Const.NOTIFICATION:
            var historyArea = $(Const.UPDATE_NOTIFICATION_TPL + ' .history ul');
            break;
    }

    $.each(ticket_histories, function (historyId, history) {
        var li = self.createHistory(history, tracker);
        historyArea.prepend(li);
    });
};

TicketUpdate.prototype.setHistory = function (ticket_history, tracker) {
    switch (tracker + '') {
        case Const.MATCH:
            var historyArea = $(Const.UPDATE_MATCHING_TPL + ' .history ul');
            break;
        case Const.WORK:
            var historyArea = $(Const.UPDATE_WORKING_TPL + ' .history ul');
            break;
        case Const.NOTIFICATION:
            var historyArea = $(Const.UPDATE_NOTIFICATION_TPL + ' .history ul');
            break;
    }

    var li = this.createHistory(ticket_history, tracker);
    historyArea.prepend(li);
};

TicketUpdate.prototype.createHistory = function (history, tracker) {
    var writer = history.writer_id;
    var name = history.writer_name;
    var date = Utils.getDate(history.created, 'y-m-d h:i:s');
    var dateElem = $('<span class="date">' + date + '</span>');
    var innerLeft = $('<img>');
    var innerRight = '';
    var watcher_histories = history.watcher_histories;
    var entry_member_histories = history.entry_member_histories;
    var live_histories = history.live_histories;
    var fight_tickets = history.fight_tickets;
    var work_tickets = history.work_tickets;
    var notification_tickets = history.notification_tickets;
    var statuses = Const.STATUS_LIST[tracker];

    innerLeft.attr('src', '/Users/getProfileImage?user=' + writer);
    if (history.author_id) {
        innerRight = $('<span class="user">' + name + '</span>が<span class="do">新規追加</span>');
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    } else if (entry_member_histories && Object.keys(entry_member_histories).length > 0) {
        var clanId = Object.keys(entry_member_histories)[0];
        var dml = entry_member_histories[clanId].dml;
        if (dml === Const.DML_INSERT) {
            innerRight = $('<span class="user">' + name + '</span>が<span class="do">参加者を追加</span>');
        } else if (dml === Const.DML_DELETE) {
            innerRight = $('<span class="user">' + name + '</span>が<span class="do">参加者を削除</span>');
        }
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    } else if (live_histories && Object.keys(live_histories).length > 0) {
        innerRight = $('<span class="user">' + name + '</span>が<span class="do">配信予定を更新</span>');
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    } else if (history.limit_date) {
        var limitDate = history.limit_date === Const.DATE_BLANK ? Const.NO_DATE : history.limit_date;

        innerRight = $('<span class="user">' + name + '</span>が<span class="do">返信期日を' + limitDate + 'に更新</span>');
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    } else if (Object.keys(statuses).indexOf(history.status + '') >= 0) {
        var statusName = statuses[history.status];

        innerRight = $('<span class="user">' + name + '</span>が<span class="do">ステータスを' + statusName + 'に更新</span>');
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    } else if (history.shoulder_id) {
        var shoulderName = history.shoulder_name;

        innerRight = $('<span class="user">' + name + '</span>が<span class="do">担当者を' + shoulderName + 'に更新</span>');
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    } else if (fight_tickets) {
        if (fight_tickets.play_title_id) {
            var titleName = fight_tickets.play_title_name;

            innerRight = $('<span class="user">' + name + '</span>が<span class="do">プレイタイトルを' + titleName + 'に更新</span>');
            return this.createHistoryLi(innerLeft, innerRight, dateElem);
        }
    } else if (work_tickets) {
        if (work_tickets.title) {
            innerRight = $('<span class="user">' + name + '</span>が<span class="do">タイトルを更新</span>');
            return this.createHistoryLi(innerLeft, innerRight, dateElem);
        }
        if (work_tickets.progress_rate >= 0) {
            innerRight = $('<span class="user">' + name + '</span>が<span class="do">進捗率を' + work_tickets.progress_rate + 'に更新</span>');
            return this.createHistoryLi(innerLeft, innerRight, dateElem);
        }
    } else if (notification_tickets) {
        if (notification_tickets.title) {
            innerRight = $('<span class="user">' + name + '</span>が<span class="do">タイトルを更新</span>');
            return this.createHistoryLi(innerLeft, innerRight, dateElem);
        }
    } else if (watcher_histories && Object.keys(watcher_histories).length > 0) {
        var clanId = Object.keys(watcher_histories)[0];
        var dml = watcher_histories[clanId].dml;
        if (dml === Const.DML_INSERT) {
            innerRight = $('<span class="user">' + name + '</span>が<span class="do">ウォッチャーを追加</span>');
        } else if (dml === Const.DML_DELETE) {
            innerRight = $('<span class="user">' + name + '</span>が<span class="do">ウォッチャーを削除</span>');
        }
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    } else if (history.start_date && history.end_date) {
        var startDate = history.start_date === Const.DATE_BLANK ? Const.NO_DATE : history.start_date;
        var endDate = history.end_date === Const.DATE_BLANK ? Const.NO_DATE : history.end_date;

        innerRight = $('<span class="user">' + name + '</span>が<span class="do">期日を' + startDate + '～' + endDate + 'に更新</span>');
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    } else if (history.description) {
        innerRight = $('<span class="user">' + name + '</span>が<span class="do">説明を更新</span>');
        return this.createHistoryLi(innerLeft, innerRight, dateElem);
    }
}


TicketUpdate.prototype.createHistoryLi = function (innerLeft, innerRight, dateTime) {
    var li = $('<li></li>');
    var container = $('<section></section>');
    var wrapperLeft = $('<section></section>');
    var wrapperRight = $('<section></section>');
    var contentLeft = $('<section></section>', {
        'class': 'contentLeft'
    });
    var contentRight = $('<section></section>', {
        'class': 'contentRight'
    });

    contentLeft.append(innerLeft);
    wrapperLeft.append(contentLeft);

    contentRight.append(innerRight);
    wrapperLeft.append(contentRight);

    wrapperRight.append(dateTime);

    container.append(wrapperLeft);
    container.append(wrapperRight);

    return li.append(container);
};

TicketUpdate.prototype.createClanNamePlate = function (clanId, clanArr) {
    var img = $('<img>', {
        src: '/Clans/getProfileImage?clan=' + clanId
    });
    var clanNm = $('<p></p>', {
        text: clanArr.name,
        'class': 'clanNm'
    });
    var userNm = $('<p></p>', {
        text: clanArr.user_name,
        'class': 'userNm'
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

    contentRight.append(clanNm, userNm);
    wrapper.append(contentRight);

    return wrapper;
}

TicketUpdate.prototype.searchEntryMember = function (searchStr) {
    var members = this.myClanData.members;
    var resultList = [];
    var resultArea = $(Const.UPDATE_MATCHING_TPL + ' .entryMember .searchAreaResult ul li');

    resultArea.each(function (i, e) {
        resultList.push($(e).attr('sys_data'));
    });
    var matchData = [];

    $.each(members, function (key, member) {
        if ((member.agreement === Const.FLG_NO - 0) || resultList.indexOf(String(member.user_id)) >= 0) return;
        if (member.user_name.indexOf(searchStr) === 0) {
            matchData.push(member);
        }
    });

    if (matchData.length > 0) {
        this.insertEntryMember(matchData);
    } else {
        this.clearEntryMember();
    }
};

TicketUpdate.prototype.clearEntryMember = function (result, obj) {
    var self = obj || this;
    self.objSearchArea.clearOutputArea();
};

TicketUpdate.prototype.insertEntryMember = function (data) {
    this.clearEntryMember();
    this.insertOutputAreaMember(data, Const.UPDATE_MATCHING_TPL + ' .entryMember');
};

TicketUpdate.prototype.insertOutputAreaMember = function (data, search_id) {
    var self = this;
    var ul = $(search_id + ' .searchOutput');

    $.each(data, function (i, arr) {
        var img = $('<img>', {
            src: '/Users/getProfileImage?user=' + arr.user_id
        });
        var spanUserNm = $('<span></span>', {
            text: arr.user_name,
            'class': 'userNm'
        });
        var li = self.objSearchArea.createUserLi(arr.user_id, img, spanUserNm, true);

        ul.append(li);
    });
    ul.show();
};

TicketUpdate.prototype.updateEntryMember = function (id) {
    var param = {
        entry_members: [
            {
                user_id: id
            }
        ]
    };

    this.objSearchArea.hideSearchArea('entryMember', true);
    this.update('entryMember', param, this.insertResultAreaMember, null, 'update');
};

TicketUpdate.prototype.insertResultAreaWatcher = function (result, obj) {
    var ticketHistory = result;
    var ticketId = ticketHistory.ticket_id;
    var userId = ticketHistory.watcher_histories[obj.clanId].user_id;
    var userName = null;

    for (let idx in obj.myClanData.members) {
        const member = obj.myClanData.members[idx];
        if (member.user_id === userId) {
            userName = member.user_name;
        }
    }

    delete ticketHistory.watcher_histories[obj.clanId].user_id;
    obj.objSearchAreaWatcher.insertResultArea('Watcher', userName, userId, true);
    Routine.setWatchers(obj.clanId, obj.projectId, ticketId, userId, userName);
    obj.updateRoutine(result, obj);
}

TicketUpdate.prototype.insertResultAreaMember = function (result, obj) {
    var ticketHistory = result;
    var ticket_id = ticketHistory.ticket_id;
    var userId = ticketHistory.entry_member_histories[obj.clanId].user_id;
    var userName = null;

    for (let idx in obj.myClanData.members) {
        const member = obj.myClanData.members[idx];
        if (member.user_id === userId) {
            userName = member.user_name;
        }
    }

    delete ticketHistory.entry_member_histories[obj.clanId].user_id;
    obj.objSearchArea.insertResultArea('EntryMember', userName, userId, true);
    Routine.setEntryMembers(obj.clanId, obj.projectId, ticket_id, userId, userName);
    obj.updateRoutine(result, obj);
};

TicketUpdate.prototype.deleteEntryMember = function (id) {
    var param = {
        entry_members: [
            {
                user_id: id
            }
        ]
    };

    this.update('entryMember', param, this.deleteEntryMemberResultOne, null, 'delete');
};

TicketUpdate.prototype.deleteEntryMemberResultOne = function (result, obj) {
    var ticketHistory = result;
    var ticket_id = ticketHistory.ticket_id;
    var projectId = ticketHistory.project_id;
    var clanId = obj.clanId;
    var userId = ticketHistory.entry_member_histories[clanId].user_id;

    delete ticketHistory.entry_member_histories[clanId].user_id;
    obj.objSearchArea.deleteResultOne('EntryMember', userId);
    Routine.deleteEntryMembers(clanId, projectId, ticket_id, userId);
    obj.updateRoutine(result, obj);
};

TicketUpdate.prototype.searchWatcher = function (searchStr) {
    var members = this.myClanData.members;
    var resultList = [];
    var resultArea = $('#ticketWatcherDlg .watcher .searchAreaResult ul li');

    resultArea.each(function (i, e) {
        resultList.push($(e).attr('sys_data'));
    });
    var matchData = [];

    $.each(members, function (key, member) {
        if ((member.agreement === Const.FLG_NO - 0) || (resultList.indexOf(String(member.user_id)) >= 0)) return;

        if (member.user_name.indexOf(searchStr) === 0) {
            matchData.push(member);
        }
    });

    if (matchData.length > 0) {
        this.insertWatcher(matchData);
    } else {
        this.clearWatcher();
    }
};

TicketUpdate.prototype.clearWatcher = function (result, obj) {
    var self = obj || this;
    self.objSearchAreaWatcher.clearOutputArea();
};

TicketUpdate.prototype.insertWatcher = function (data) {
    this.clearWatcher();
    this.insertOutputAreaMember(data, '#ticketWatcherDlg .watcher');
};

TicketUpdate.prototype.updateWatcher = function (id) {
    var param = {
        watchers: [
            {
                user_id: id
            }
        ]
    };

    this.objSearchAreaWatcher.hideSearchArea('watcher', true);
    this.update('watcher', param, this.insertResultAreaWatcher, null, 'update');
};

TicketUpdate.prototype.deleteWatcher = function (userId) {
    var param = {
        watchers: [
            {
                user_id: userId
            }
        ]
    };

    this.update('watcher', param, this.deleteWatcherResultOne, null, 'delete');
};

TicketUpdate.prototype.deleteWatcherResultOne = function (result, obj) {
    var ticketHistory = result;
    var ticket_id = ticketHistory.ticket_id;
    var projectId = ticketHistory.project_id;
    var clanId = obj.clanId;
    var userId = ticketHistory.watcher_histories[clanId].user_id;

    delete ticketHistory.watcher_histories[clanId].user_id;
    obj.objSearchAreaWatcher.deleteResultOne('Watcher', userId);
    Routine.deleteWatchers(clanId, projectId, ticket_id, userId);
    obj.updateRoutine(result, obj);
};

TicketUpdate.prototype.updateLimitDate = function (stepObj) {
    var param = {
        limit_date: Utils.getDate($(Const.UPDATE_TICKET_TPL + ':visible .datepick_limit').datepicker('getDate'), 'y-m-d')
    };

    stepObj.hide();
    this.update('limitDate', param, this.updateRoutine, this.undoLimitDate, 'update');
};

TicketUpdate.prototype.setLive = function (stepObj) {
    stepObj.find('.error').hide();
    this.insertLive(this.ticketsData[this.ticketId].lives[this.clanId]);
    stepObj.show();
};

TicketUpdate.prototype.updateLive = function () {
    var tplObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    var stepObj = tplObj.find('.live .stepContent');
    var exClass = 'live';
    var exId = $(Const.UPDATE_TICKET_TPL + ':visible').attr('id');
    var queueNum = this.loadStart(exClass, true, exId);
    var live = stepObj.find('.selection li a[class="active"]').attr('sys_data');
    var lives = {
        live: live,
        live_url: live === Const.LIVE_YES ? stepObj.find('[name="live_url"]').val() : ''
    };
    var errors = this.objLiveValidation.validate(lives);

    if (errors.length > 0) {
        this.showError(errors, exClass, queueNum, exId);
    } else {
        var param = {
            ticket_id: this.ticketId,
            clan_id: this.clanId,
            tracker: tplObj.find('[name="tracker"]').val(),
            lives: [
                lives
            ]
        };
        this.exId = exId;
        this.emit(exClass, 'update', param, this.updateRoutine, null, true, queueNum);
    }
};

TicketUpdate.prototype.undoLimitDate = function (result, obj) {
    var beforeLimitDate = obj.ticketsData[obj.ticketId].limit_date;
    var visibleTpl = $(Const.UPDATE_TICKET_TPL + ':visible');
    var formatLimitDate = Utils.getDate(beforeLimitDate, 'y-m-d');
    visibleTpl.find('.limitDate .date').text(formatLimitDate);
    visibleTpl.find('.datepick_limit').datepicker('setDate', formatLimitDate);
}

TicketUpdate.prototype.updateRoutine = function (result, obj) {
    var self = obj || this;
    var ticketHistory = result;
    var ticket_id = ticketHistory.ticket_id;
    var projectId = ticketHistory.project_id;
    var clanId = obj.clanId;
    var historyId = ticketHistory.id;
    var fight_tickets = ticketHistory.fight_tickets;
    var work_tickets = ticketHistory.work_tickets;
    var notification_tickets = ticketHistory.notification_tickets;
    var live_histories = ticketHistory.live_histories;

    if (ticketHistory.limit_date || ticketHistory.limit_date === '') {
        Routine.updateTickets(clanId, projectId, ticket_id, 'limit_date', ticketHistory.limit_date);
    } else if (ticketHistory.status) {
        Routine.updateTickets(clanId, projectId, ticket_id, 'status', ticketHistory.status);
        if (ticketHistory.fight_tickets) {
            Routine.updateFightTickets(clanId, projectId, ticket_id, {
                'winner_id': fight_tickets.winner_id,
                'winner_name': fight_tickets.winner_name,
                'loser_id': fight_tickets.loser_id,
                'loser_name': fight_tickets.loser_name,
                'draw': fight_tickets.draw
            });
        }
    } else if ((ticketHistory.start_date || ticketHistory.start_date === '') || (ticketHistory.end_date || ticketHistory.end_date === '')) {
        Routine.updateTickets(clanId, projectId, ticket_id, 'start_date', ticketHistory.start_date);
        Routine.updateTickets(clanId, projectId, ticket_id, 'end_date', ticketHistory.end_date);
    } else if (ticketHistory.shoulder_id) {
        Routine.updateTickets(clanId, projectId, ticket_id, 'shoulder_id', ticketHistory.shoulder_id);
        Routine.updateTickets(clanId, projectId, ticket_id, 'shoulder_name', ticketHistory.shoulder_name);
    } else if (live_histories && live_histories[clanId]) {
        var liveHistory = live_histories[clanId];
        Routine.updateLives(clanId, projectId, ticket_id, {
            'live': liveHistory.live,
            'live_url': liveHistory.live_url
        });
    } else if (ticketHistory.description || ticketHistory.description === '') {
        Routine.updateTickets(clanId, projectId, ticket_id, 'description', ticketHistory.description);
    } else if (work_tickets) {
        if (work_tickets.progress_rate) {
            Routine.updateWorkTickets(clanId, projectId, ticket_id, 'progress_rate', work_tickets.progress_rate);
        } else if (work_tickets.title || work_tickets.title === '') {
            Routine.updateWorkTickets(clanId, projectId, ticket_id, 'title', work_tickets.title);
        }
    } else if (notification_tickets && (notification_tickets.title || notification_tickets.title === '')) {
        Routine.updateNotificationTickets(clanId, projectId, ticket_id, 'title', notification_tickets.title);
    } else if (fight_tickets) {
        if (fight_tickets.play_title_id) {
            Routine.updateFightTickets(clanId, projectId, ticket_id, 'play_title_id', fight_tickets.play_title_id);
            Routine.updateFightTickets(clanId, projectId, ticket_id, 'play_title_name', fight_tickets.play_title_name);
        }
    }

    Routine.updateTickets(clanId, projectId, ticket_id, 'writer_id', ticketHistory.writer_id);
    Routine.updateTickets(clanId, projectId, ticket_id, 'writer_name', ticketHistory.writer_name);
    Routine.updateTickets(clanId, projectId, ticket_id, 'writer_clan_id', ticketHistory.writer_clan_id);
    Routine.updateTickets(clanId, projectId, ticket_id, 'writer_clan_name', ticketHistory.writer_clan_name);
    Routine.updateTickets(clanId, projectId, ticket_id, 'writer_clan_user_id', ticketHistory.writer_clan_user_id);
    Routine.updateTickets(clanId, projectId, ticket_id, 'writer_clan_user_name', ticketHistory.writer_clan_user_name);
    Routine.updateTickets(clanId, projectId, ticket_id, 'modified', JSON.stringify(new Date(ticketHistory.modified)));
    Routine.setTicketHistories(clanId, projectId, ticket_id, historyId, ticketHistory);
    self.setHistory(ticketHistory, ticketHistory.tracker);
};

TicketUpdate.prototype.searchShoulder = function (searchStr) {
    var relatedUsers = [];
    var resultUsers = [];
    var targetObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    var tracker = targetObj.find('[name="tracker"]').val();
    var ticketId = this.ticketId;
    var ticket = this.ticketsData[ticketId];
    var matchData = [];

    targetObj.find('.shoulder .searchAreaResult ul li').each(function (i, e) {
        resultUsers.push($(e).attr('sys_data'));
    });

    switch (tracker) {
        case Const.MATCH:
            var fightTicket = ticket.fight_tickets;
            relatedUsers.push({
                userId: ticket.clan_user_id,
                userName: ticket.clan_user_name
            });
            relatedUsers.push({
                userId: fightTicket.opponent_user_id,
                userName: fightTicket.opponent_user_name
            });
            break;
        default:
            relatedUsers.push({
                userId: this.myClanData.profile.user_id,
                userName: this.myClanData.profile.user_name
            });
            $.each(this.myClanData.members, function (idx, member) {
                if (member.agreement === Const.FLG_YES - 0) {
                    relatedUsers.push({
                        userId: member.user_id,
                        userName: member.user_name
                    });
                }
            });
    }

    $.each(relatedUsers, function (i, user) {
        if (resultUsers.indexOf(user.userId + '') >= 0) {
            return;
        } else if (user.userName.indexOf(searchStr) === 0) {
            matchData.push({
                id: user.userId,
                name: user.userName
            });
        }
    });

    if (matchData.length > 0) {
        this.insertShoulder(matchData);
    } else {
        this.objSearchArea.clearOutputArea();
    }
};

TicketUpdate.prototype.updateDescription = function () {
    var tplObj = $(Const.UPDATE_TICKET_TPL + ':visible');
    var tracker = tplObj.find('[name="tracker"]').val();
    var description = '';

    switch (tracker) {
        case Const.MATCH:
            description = this.qlMatchObj.container.firstChild.innerHTML;
            break;
        case Const.WORK:
            description = this.qlWorkObj.container.firstChild.innerHTML;
            break;
        case Const.NOTIFICATION:
            description = this.qlNotificationObj.container.firstChild.innerHTML;
            break;
    }

    if (description === this.ticketsData[this.ticketId].description) {
        return;
    }

    var param = {
        ticket_id: this.ticketId,
        clan_id: this.clanId,
        tracker: tracker,
        description: description
    }

    var exId = $(Const.UPDATE_TICKET_TPL + ':visible').attr('id');
    var exClass = 'description';
    var queueNum = this.loadStart(exClass, true, exId);
    var errors = this.objTicketValidation.validate(param);

    if (errors.length > 0) {
        this.showError(errors, exClass, queueNum, exId);
    } else {
        this.exId = exId;
        this.emit(exClass, 'update', param, this.updateRoutine, null, true, queueNum);
    }
};

TicketUpdate.prototype.insertShoulder = function (data) {
    this.objSearchArea.clearOutputArea();
    this.objSearchArea.insertSearchOutput(data, 'shoulder', true);
};

TicketUpdate.prototype.clearShoulder = function () {
    this.objSearchArea.clearOutputArea();
};

TicketUpdate.prototype.updateShoulder = function (shoulder) {
    var param = {
        shoulder: shoulder
    };

    this.objSearchArea.hideSearchArea('shoulder', true);
    this.update('shoulder', param, this.insertShoulderResultArea, null, 'update');
}

TicketUpdate.prototype.insertShoulderResultArea = function (result, obj) {
    var data = result;
    var sys_data = data.shoulder_id;
    var text = data.shoulder_name;
    var targetObj = $(Const.UPDATE_TICKET_TPL + ':visible .shoulder');
    var resultList = targetObj.find('.searchAreaResult ul');

    targetObj.find('.searchAreaResult ul').empty();
    var innerLeft = $('<img>', {
        src: '/Users/getProfileImage?user=' + sys_data
    });
    var innerRight = $('<span></span>', {
        text: text,
        'class': 'userNm'
    });

    var li = obj.createShoulderLi(sys_data, innerLeft, innerRight);

    resultList.append(li);

    obj.updateRoutine(result, obj);
};

TicketUpdate.prototype.createShoulderLi = function (sys_data, innerLeft, innerRight) {
    var li = $('<li></li>', {
        sys_data: sys_data
    });
    var wrapper = $('<section></section>');
    var contentLeft = $('<section></section>', {
        'class': 'contentLeft'
    });
    var contentRight = $('<section></section>', {
        'class': 'contentRight'
    });

    contentLeft.append(innerLeft);
    wrapper.append(contentLeft);

    contentRight.append(innerRight);
    wrapper.append(contentRight);
    li.append(wrapper);

    return li;
};

TicketUpdate.prototype.insertShouder = function (stepObj) {
    var targetObj = $(Const.UPDATE_TICKET_TPL + ':visible .shoulder');
    var targetArea = targetObj.find('.user');
    if (stepObj.find('.searchAreaResult ul li')[0]) {
        var img = stepObj.find('.searchAreaResult .contentLeft img');
        var spanUserNm = stepObj.find('.searchAreaResult .userNm');

        stepObj.hide();
        targetArea.empty();
        targetArea.append([img.clone(), spanUserNm.clone()]);
        if (!targetObj.find('.exist:visible')[0]) {
            targetObj.find('.notExist').hide();
            targetObj.find('.exist').show();
        }
    } else {
        stepObj.hide();
    }
};

TicketUpdate.prototype.insertLive = function (myLive) {
    $(Const.UPDATE_MATCHING_TPL + ' .live .selection li .active').removeClass('active');
    $(Const.UPDATE_MATCHING_TPL + ' .live .selection li').find('[sys_data="' + myLive.live + '"]').addClass('active');
    if (myLive.live + '' === Const.LIVE_YES) {
        $(Const.UPDATE_MATCHING_TPL + ' .live [name="live_url"]').val(myLive.live_url);
        $(Const.UPDATE_MATCHING_TPL + ' .live [name="live_url"]').show();
    } else {
        $(Const.UPDATE_MATCHING_TPL + ' .live [name="live_url"]').val('');
        $(Const.UPDATE_MATCHING_TPL + ' .live [name="live_url"]').hide();
    }
};