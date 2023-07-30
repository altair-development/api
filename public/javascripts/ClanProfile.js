ClanProfile = function (svcLoc) {
    BaseAjax.call(this);
    this.svcLoc = svcLoc;
    this.objSearchData = svcLoc.get('objSearchData');
    this.nsp = svcLoc.get('clansNsp');
    this.quillChange = false;
};

ClanProfile.prototype = Object.create(BaseAjax.prototype);
ClanProfile.prototype.constructor = ClanProfile;

ClanProfile.prototype.initialize = function (isOwner, ownerProgress) {
    this.clanId = this.svcLoc.get('clan_id');
    this.isOwner = isOwner;
    this.myClan = Routine.myClans[this.clanId];
    if (this.isOwner) {
        this.exId = 'profile .owner';
        if (!ownerProgress.ownerProgress) {
            this.objSearchArea = new SearchArea('#' + this.exId, this);
            this.objDragAndDropHandler = new DragAndDropHandler(this.exId, this);
            this.objGameTitleValidation = new GameTitleValidation(this.exId);
            this.objClanValidation = new ClanValidation();
            this.quill = null;
            this.listener();
        }
    } else {
        this.exId = 'profile .notOwner';
    }
}

ClanProfile.prototype.load = function () {
    $('.tabActive .loader').show();
    $('#profile .notOwner, #profile .owner').hide();
    this.clear();
    this.insertProfile();
};

ClanProfile.prototype.insertProfile = function () {
    var self = this;
    var clan = this.myClan.profile;

    if (!clan) this.profileNotFound();

    var playTitles = this.myClan.play_titles;
    var members = this.myClan.members;
    var img = $('<img>', {
        src: '/Clans/getProfileImage?clan=' + this.clanId
    });

    if (this.isOwner) {
        $.each(playTitles, function (i, e) {
            self.objSearchArea.insertResultArea('PlayTitles', e.title_name, e.title_id);
        });

        $.each(members, function (i, e) {
            self.objSearchArea.insertResultArea('Member', e.user_name, e.user_id);
        });

        $('#' + this.exId + ' .image').append(img);

        if (clan.description.length > 0) {
            this.quill.clipboard.dangerouslyPasteHTML(clan.description);
        } else {
            this.quill.clipboard.dangerouslyPasteHTML('');
        }
    } else {
        var result_area = $('#' + this.exId + ' .playTitles .searchAreaResult ul');

        $.each(playTitles, function (i, e) {
            var li = $('<li></li>', {
                text: e.title_name,
                sys_data: e.title_id
            });

            result_area.append(li);
        });

        result_area = $('#' + this.exId + ' .member .searchAreaResult ul');

        $.each(members, function (i, e) {
            var li = $('<li></li>', {
                text: e.user_name,
                sys_data: e.user_id
            });

            result_area.append(li);
        });

        $('#' + this.exId + ' .image').append(img);
        $('#' + this.exId + ' .description iframe').attr('src', '/Clans/getDescription?clan=' + this.clanId);
    }

    this.show();
};

ClanProfile.prototype.show = function () {
    $('#clan #' + this.exId).show();
    $('#clan #profile').show();
    $('#clan').show();
    $('.tabActive .loader').hide();
};

ClanProfile.prototype.clear = function () {
    $('#' + this.exId + ' .image').children().remove();
    $('#' + this.exId + ' #image').val('');
    $('#' + this.exId + ' .playTitles .searchAreaResult ul').children().remove();
    $('#' + this.exId + ' .member .searchAreaResult ul').children().remove();
    if (this.isOwner) {
        this.quill.clipboard.dangerouslyPasteHTML('');
    } else {
        $('#' + this.exId + ' .description iframe').attr('src', '');
    }
};

ClanProfile.prototype.listener = function () {
    var self = this;

    this.quill = new Quill('#editor', {
        theme: 'snow'
    });

    this.quill.on('text-change', function (delta, oldDelta, source) {
        if (source === Const.QL_CH_USER) {
            self.quillChange = true;
        }
    });

    $('#' + this.exId + ' .ql-editor').on('blur', function () {
        if (self.quillChange) {
            self.quillChange = false;
            var description = self.quill.container.firstChild.innerHTML;
            var param = {
                description: description
            }

            self.updateDescription(param);
        }
    });

    $('#' + this.exId + ' #editor').on('blur', function (e) {

        return false;
    });

    this.objSearchArea.listen();

    $(document).on("change", '#' + this.exId + ' #image', function () {
        var file = this.files[0];
        if (file != null) {
            self.uploadProfImage(file);
        }
    });

    $('#' + this.exId + ' .imageArea').hover(
        function () {
            $('.dd').show();
        },
        function () {
            $('.dd').hide();
        }
    );

    this.objDragAndDropHandler.listen('.imageArea', this.uploadProfImage);
};

ClanProfile.prototype.clearMember = function (result, obj) {
    var self = obj || this;
    self.objSearchArea.clearOutputArea();
};

ClanProfile.prototype.insertMember = function (data) {
    this.clearMember();
    this.objSearchArea.insertSearchOutput(data, 'member');
};

ClanProfile.prototype.insertPlayTitles = function (data) {
    this.clearPlayTitles();
    this.objSearchArea.insertSearchOutput(data, 'playTitles');
};

ClanProfile.prototype.clearPlayTitles = function (result, obj) {
    var self = obj || this;
    self.objSearchArea.clearOutputArea();
};

ClanProfile.prototype.updateDescription = function (param) {
    param['id'] = this.clanId;
    var exClass = 'description';
    var queueNum = this.loadStart(exClass, true);
    var errors = this.objClanValidation.validate(param);

    if (errors.length > 0) {
        this.showError(errors, exClass, queueNum);
    } else {
        this.emit(exClass, 'update', param, this.updateRoutine, null, true, queueNum);
    }
};

ClanProfile.prototype.updateRoutine = function (result, obj) {
    if (result.description) {
        Routine.updateProfile(obj.clanId, 'description', result.description);
    }
};

ClanProfile.prototype.updateMember = function (id) {
    var param = {
        clan_id: this.clanId,
        user_id: id
    };

    this.objSearchArea.hideSearchArea('member');
    this.loadingEmit('member', 'updateMember', param, this.insertMemberResultArea);
};

ClanProfile.prototype.insertMemberResultArea = function (result, obj) {
    obj.objSearchArea.insertResultArea('Member', result.name, result.id);
    Routine.setMembers(obj.clanId, result.id, result.name);
};

ClanProfile.prototype.searchMember = function (searchStr) {
    var members = this.myClan.members;
    var tmpMembers = [];
    for (var member in members) {
        tmpMembers.push(members[member].user_id);
    }
    tmpMembers.push(this.myClan.profile.user_id);
    this.objSearchData.searchMembers(tmpMembers, searchStr, this, function (err, matchData) {
        if (err) {
            // TODO エラー処理
        } else if (matchData.length > 0) {
            this.insertMember(matchData);
        } else {
            this.clearMember();
        }
    });
};

ClanProfile.prototype.deleteMember = function (user_id) {
    var param = {
        user_id: user_id,
        clan_id: this.clanId
    };

    this.loadingEmit('member', 'deleteMember', param, this.deleteMemberResultOne);
};

ClanProfile.prototype.deleteMemberResultOne = function (result, obj) {
    obj.objSearchArea.deleteResultOne('Member', result.id);
    Routine.deleteMembers(obj.clanId, result.id);
};

ClanProfile.prototype.searchPlayTitles = function (searchStr) {
    searchStr = Utils.lcRemoveSp(searchStr);
    var playTitles = this.myClan.play_titles;
    var tmpPlayTitles = [];
    for (var idx in playTitles) {
        tmpPlayTitles.push(playTitles[idx].title_id);
    }
    this.objSearchData.searchPlayTitles(tmpPlayTitles, searchStr, this, function (err, matchData) {
        if (err) {
            // TODO エラー処理
        } else if (matchData.length > 0) {
            this.insertPlayTitles(matchData);
        } else {
            this.clearPlayTitles();
        }
    });
};

ClanProfile.prototype.updatePlayTitles = function (id) {
    var param = {
        title_id: id,
        clan_id: this.clanId
    };

    this.objSearchArea.hideSearchArea('playTitles');
    this.loadingEmit('playTitles', 'updatePlayTitles', param, this.insertPlayTitleResultArea);
};

ClanProfile.prototype.insertPlayTitleResultArea = function (result, obj) {
    obj.objSearchArea.insertResultArea('PlayTitles', result.name, result.id);
    Routine.setPlayTitles(obj.clanId, result.id, result.name);
};

ClanProfile.prototype.deletePlayTitles = function (title_id) {
    var param = {
        title_id: title_id,
        clan_id: this.clanId
    };

    this.loadingEmit('playTitles', 'deletePlayTitles', param, this.deletePlayTitleResultOne);
};

ClanProfile.prototype.deletePlayTitleResultOne = function (result, obj) {
    obj.objSearchArea.deleteResultOne('PlayTitles', result.id);
    Routine.deletePlayTitles(obj.clanId, result.id);
};

ClanProfile.prototype.createPlayTitles = function (title) {
    var param = {
        clan_id: this.clanId,
        name: title
    };
    var exClass = 'playTitles';
    var errors = this.objGameTitleValidation.validate(param, exClass);
    var queueNum = this.loadStart(exClass, true);

    if (errors.length > 0) {
        this.showError(errors, exClass, queueNum);
    } else {

        this.emit(exClass, 'createGameTitles', param, this.insertPlayTitleResultAreaGm, this.clearPlayTitles, true, queueNum);
    }
};

ClanProfile.prototype.insertPlayTitleResultAreaGm = function (result, obj) {
    obj.objSearchArea.insertResultArea('PlayTitles', result.name, result.id);
    Routine.setPlayTitles(obj.clanId, result.id, result.name);
};

ClanProfile.prototype.uploadProfImage = function (file, obj) {
    var self = obj || this;
    // var url = '/Clans/uploadProfImage';
    var validationParam = {
        prof_ext: self.getExtension(file.name)
    };

    var exClass = 'profileImg';
    var queueNum = self.loadStart(exClass, true, queueNum);
    var errors = self.objClanValidation.validate(validationParam);

    if (errors.length > 0) {
        self.showError(errors, exClass, queueNum);
    } else {
        var data = {
            file: file,
            name: file.name,
            id: self.clanId
        };
        self.emit(exClass, 'uploadProfImage', data, self.insertProfImage, null, true, queueNum);
    }
};

ClanProfile.prototype.getExtension = function (fileName) {
    var ret;
    var fileTypes = fileName.split(".");
    var len = fileTypes.length;

    ret = fileTypes[len - 1];
    return ret;
};

ClanProfile.prototype.insertProfImage = function (response, obj) {
    var self = obj;

    $('#' + self.exId + ' .image img').attr('src', response.url);
};

ClanProfile.prototype.profileNotFound = function () {
    $('.tabActive .loader').hide();
    Utils.redirectHome();
};
