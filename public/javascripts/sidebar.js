Sidebar = function (svcLoc) {
    BaseAjax.call(this);
    this.nsp = svcLoc.get('projectsNsp');
    this.svcLoc = svcLoc;
};

Sidebar.prototype = Object.create(BaseAjax.prototype);
Sidebar.prototype.constructor = Sidebar;

Sidebar.prototype.initialize = function () {
    this.objSearchArea = new SearchArea(Const.CREATE_PROJECT_DLG, this);
    this.objProjectValidation = new ProjectValidation();
    this.myClansData = Routine.myClans;
    this.drawRelatedClan();
    this.listener();
}

Sidebar.prototype.listener = function () {
    var self = this;

    this.objSearchArea.listen();

    $(Const.CREATE_PROJECT_DLG + " .datepick_start").datepicker({
        dateFormat: 'yy-mm-dd'
    });
    $(Const.CREATE_PROJECT_DLG + " .datepick_end").datepicker({
        dateFormat: 'yy-mm-dd'
    });

    $('#createClan').on('click', function (e) {
        if ($('.createError')[0]) {
            $('.createError').remove();
        }

        $('#newClan').show();
        $('#newClan input').focus();
    });

    $(document).on('blur', '#newClan input', function (e) {
        if ($(e.target).val().length > 0) {
            $('#create').trigger('submit');
        } else {
            $('#newClan [name="name"]').val('');
            $('#newClan').hide();
        }
    });

    $('#create').submit(function (e) {
        if ($('#newClan input').val().length > 0) {
            if ($('#newClan').attr('sys_data') === 'true') {
                $('#newClan').attr('sys_data', 'false');
                self.create();
            }
        } else {
            $('#newClan [name="name"]').val('');
            $('#newClan').hide();
        }
        return false;
    });

    $('.createProject').on('click', function (e) {
        var clanId = $(e.target).closest('li').data('clan-id');
        $(Const.CREATE_PROJECT_DLG).data('clan-id', clanId);
        $(Const.CREATE_PROJECT_DLG).dialog({
            modal: true,
            title: 'プロジェクトを作成する',
            open: function (event, ui) {
                $(".ui-dialog-titlebar-close").hide();
                // self.clearTpl();
            },
            // close: function (event, ui) {
            //     self.reload();
            // }
        });
    });

    $(Const.CREATE_PROJECT_DLG + ' .submit').on('click', function () {
        self.createProject();
    });

    $(document).on('click', '.ui-widget-overlay', function () {
        var content = $(this).prev().find('.ui-dialog-content');
        if (content.attr('id') === Const.CREATE_PROJECT_DLG.slice(1)) {
            self.cancel(content);
        }
    });

    $(Const.CREATE_PROJECT_DLG + ' .cancel').on('click', function () {
        self.cancel($(Const.CREATE_PROJECT_DLG));
    });
};

Sidebar.prototype.cancel = function (dlgObj) {
    dlgObj.dialog('close');
}

Sidebar.prototype.createProject = function () {
    var tplObj = $(Const.CREATE_PROJECT_DLG);
    var exClass = null;
    var exId = Const.CREATE_PROJECT_DLG.slice(1);
    var queueNum = this.loadStart(exClass, true, exId);
    var watchers = [];

    $(Const.CREATE_PROJECT_DLG + ' .submitArea .submit .text').hide();
    $(Const.CREATE_PROJECT_DLG + ' .watcher .searchAreaResult li').each(function (i, e) {
        watchers.push({
            user_id: $(e).attr('sys_data')
        });
    });

    var param = {
        clan_id: tplObj.data('clan-id'),
        watchers: watchers,
        name: tplObj.find('[name="name"]').val(),
        start_date: tplObj.find('[name="start_date"]').val(),
        end_date: tplObj.find('[name="end_date"]').val(),
    };
    var errors = this.objProjectValidation.validate(param);

    if (errors.length > 0) {
        $(Const.CREATE_PROJECT_DLG + ' .submitArea .submit .text').show();
        this.showError(errors, exClass, queueNum, exId);
        return;
    }
    this.emit(exClass, 'create', param, this.prjctCrDone, this.prjctCrFail, true, queueNum, exId);
}

Sidebar.prototype.prjctCrDone = function (result, obj) {
    var project = result.project;
    var projectId = Object.keys(project)[0];
    var clanId = result.clan_id;

    Routine.setProjects(clanId, projectId, project[projectId]);
    $(Const.CREATE_PROJECT_DLG + ' .submitArea .submit .text').show();
    $(Const.CREATE_PROJECT_DLG).dialog('close');

    var projectListObj = $('#sidebar .clan[data-clan-id="' + clanId + '"] .projectList');
    projectListObj.append(obj.createProjectLi(clanId, projectId, project[projectId].info.name));
    Utils.redirectProjectList(clanId, projectId);
}

Sidebar.prototype.prjctCrFail = function (result, obj) {
    $(Const.CREATE_PROJECT_DLG + ' .submitArea .submit .text').show();
}

Sidebar.prototype.drawRelatedClan = function () {
    var objHome = $('#sidebar .home');
    for (var id in Routine.myClans) {
        var clan = Routine.myClans[id].profile;
        var projects = Routine.myClans[id].projects;
        var className = clan.agreement == Const.FLG_YES ? '' : 'invite';
        var li = $('<li></li>', {
            'class': 'clan',
            'data-clan-id': id
        });
        var a = $('<a></a>', {
            href: Utils.getClanUrl(id),
            is_owner: clan.is_owner,
            'class': className,
            text: clan.name
        });

        li.append(a);
        li.append(this.createBtn());
        li.append(this.createProjectUl(id, projects));
        objHome.after(li);
    }
}

Sidebar.prototype.createBtn = function () {
    return $('<a></a>', {
        href: 'javascript:void(0)',
        'class': 'createProject'
    })
    .append($('<img>', {
        src: Utils.getImageUrl('ico_plus.png')
    }));
}

Sidebar.prototype.createProjectUl = function (clanId, projects) {
    var ul = $('<ul></ul>', {
        'class': 'projectList'
    });
    for (var id in projects) {
        var projectInfo = projects[id].info;
        ul.append(this.createProjectLi(clanId, id, projectInfo.name));
    }

    return ul;
}

Sidebar.prototype.createProjectLi = function (clanId, projectId, projectName) {
    var href = Utils.getProjectUrl(clanId, projectId);
    var li = $('<li></li>');
    var a = $('<a></a>', {
        href: href,
        text: projectName
    });

    li.append(a);

    return li;
}

Sidebar.prototype.create = function () {
    var target = $('#newClan').find('input');
    var name = target.val();

    if (name.length > 0) {
        var csrf = $('input[name=_csrf]').val();
        var param = {
            'name': name
        };
        var url = '/Clans/create';

        $.ajax({
            url: url,
            type: "POST",
            data: {
                'param': param,
                '_csrf': csrf
            },
            dataType: "json",
            context: this,
            success: function (response) {
                var clan = response.result;
                var authId = $('[name="auth_id"]').val();
                //通信が成功した場合
                if (clan.success != false) {
                    $('#newClan [name="name"]').val('');
                    $('#newClan').hide();
                    var li = $('<li></li>');
                    var a = $('<a></a>', {
                        href: Utils.getClanUrl(clan.data.id),
                        text: clan.data.name,
                        is_owner: '1'
                    });
                    li.append(a);
                    $('#newClan').before(li);
                    Routine.setMyClan(clan.data.id, clan.data);
                } else {
                    this.createError('保存エラー');
                }
            },
            error: function (response) {
                this.createError('通信失敗');
            }
        });
    } else {
        $('#newClan [name="name"]').val('');
        $('#newClan').hide();
    }
    $('#newClan').attr('sys_data', 'true');
}

Sidebar.prototype.createError = function (message) {
    $('#createClan').closest('li').after($('<li></li>', {
        text: message,
        'class': 'createError'
    }));
    $('#newClan [name="name"]').val('');
    $('#newClan').hide();
}

Sidebar.prototype.searchWatcher = function (searchStr) {
    var clanId = $(Const.CREATE_PROJECT_DLG).data('clan-id');
    var myClanData = this.myClansData[clanId];
    var members = myClanData.members;
    var resultList = [];
    var resultArea = $(Const.CREATE_PROJECT_DLG + ' .watcher .searchAreaResult ul li');

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

Sidebar.prototype.insertMember = function (className, data) {
    this.objSearchArea.clearOutputArea();
    this.objSearchArea.insertSearchOutput(data, className, true);
};

Sidebar.prototype.clearWatcher = function () {
    this.objSearchArea.clearOutputArea();
};

Sidebar.prototype.updateWatcher = function (id, name) {
    this.objSearchArea.hideSearchArea('watcher', true);
    this.objSearchArea.insertResultArea('Watcher', name, id, true);
};

Sidebar.prototype.deleteWatcher = function (id) {
    this.objSearchArea.deleteResultOne('Watcher', id);
};