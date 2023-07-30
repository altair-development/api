InviteController = function (svcLoc) {
    BaseAjax.call(this);
    this.svcLoc = svcLoc;
    this.nsp = svcLoc.get('invitesNsp');
    this.listner();
};

InviteController.prototype = Object.create(BaseAjax.prototype);
InviteController.prototype.constructor = InviteController;

InviteController.prototype.initialize = function (clanId, clanName, userId) {
    this.clanId = this.svcLoc.get('clan_id');
    this.clanName = Routine.myClans[this.clanId].profile.name;
    this.userId = userId;
    this.exId = 'inviteDlg';
};

InviteController.prototype.listner = function () {
    var self = this;

    $('#inviteDlg .btn-agree').on('click', function () {
        if (!$('#' + self.exId + ' .loader:visible')[0]) {
            self.agree();
        }
    });

    $('#inviteDlg .btn-disagree').on('click', function () {
        if (!$('#' + self.exId + ' .loader:visible')[0]) {
            self.disAgree();
        }
    });

    $('#inviteDlg .btn-cancel').on('click', function (e) {
        if (!$('#' + self.exId + ' .loader:visible')[0]) {
            var dlgObj = $('#inviteDlg');
            self.cancel(dlgObj);
        }
    });

    $(document).on('click', '.ui-widget-overlay', function () {
        var content = $(this).prev().find('.ui-dialog-content');
        if (content.attr('id') === 'inviteDlg') {
            self.cancel(content);
        }
    });
};

InviteController.prototype.popupAction = function () {
    var self = this;
    $('#inviteDlg').dialog({
        modal: true,
        title: self.clanName + "から招待を受けています。",
        open: function (event, ui) {
            $(".ui-dialog-titlebar-close").hide();
        }
    });
};

InviteController.prototype.cancel = function (dlgObj) {
    dlgObj.dialog('close');
    history.back();
};

InviteController.prototype.agree = function () {
    var param = {
        'clan_id': this.clanId
    };
    var exClass = 'btn-agree';
    var queueNum = this.loadStart(exClass);

    this.emit(exClass, 'agree', param, this.agreeSuccess, this.agreeFail, true, queueNum);
};

InviteController.prototype.agreeSuccess = function (result, obj) {
    var self = obj;

    $.when(Routine.selectRelatedClan())
        .done(function () {
            var dlgObj = $('#inviteDlg');

            $('.pageActive').removeClass('invite');
            dlgObj.dialog('close');
            self.loadEnd(self);
            $(window).hashchange();
        })
        .fail(function (err) {
            console.log(err);
            // TODO エラー処理
        });
};

InviteController.prototype.agreeFail = function (result, obj) {
    obj.loadEnd(obj);
    var targetObj = $('#' + obj.exId + ' .btn-agree').find('.fail');

    targetObj.show();
    setTimeout(function () {
        targetObj.fadeOut(500);
    }, 3000);
};

InviteController.prototype.disAgree = function () {
    var param = {
        'clan_id': this.clanId
    };

    this.loadingEmit('btn-disagree', 'disAgree', param, this.disAgreeSuccess);
};

InviteController.prototype.disAgreeSuccess = function (result, obj) {
    var url = Utils.getClanUrl(obj.clanId);
    var activeSidebar = $('#sidebar a[href^="' + url + '"]').closest('li');
    activeSidebar.remove();
    obj.cancel($('#inviteDlg'));
};
