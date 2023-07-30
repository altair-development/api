function SearchArea(id, obj) {
    this.instance = id;
    this.callerObj = obj;
};

SearchArea.prototype.listen = function () {
    var self = this;
    var htmlObj = $(this.instance);
    htmlObj.find('.inputSearchArea').on('click', function (e) {
        if (!self.callerObj.dmlLock) {
            var visible = htmlObj.find('.searchArea:visible');
            if (visible[0]) {
                var targetObj = $(visible).closest('[search_id]');
                var targetId = targetObj.attr('search_id');
                var noHide = targetObj.attr('no_hide');

                self.hideSearchArea(Utils.lcfirst(targetId), noHide);
            }
            var targetObj = $(e.target).closest('[search_id]');
            targetObj.find('.success, .fail').hide();
            self.clearSearchArea();
            targetObj.find('.searchArea').show();
            targetObj.find('.searchArea input[type="text"]').focus();
            $(e.target).hide();
        }
    });

    htmlObj.find('.searchArea input').on('input', function (e) {
        var targetObj = $(e.target).closest('[search_id]');
        var targetId = targetObj.attr('search_id');

        if ($(e.target).val().length > 0) {
            self.callerObj['search' + targetId]($(e.target).val());
        } else {
            self.callerObj['clear' + targetId]();
        }
    });

    $(document).on('click', this.instance + ' .searchOutput a', function (e) {
        self.searchOutputHandler(e);
    });

    htmlObj.find('.searchCreate').submit(function (e) {
        var targetObj = $(e.target).closest('[search_id]');
        var targetId = targetObj.attr('search_id');
        var resultList = targetObj.find('.searchAreaResult ul');
        var title = targetObj.find('.searchInput').val();



        if (title.length > 0) {
            self.callerObj['create' + targetId](title, resultList);
        } else {
            self.callerObj['clear' + targetId]();
        }

        return false;
    });

    $(document).on('click', this.instance + ' .searchAreaDelete', function (e) {
        var targetObj = $(e.target).closest('[search_id]');
        var targetId = targetObj.attr('search_id');
        var sys_data = $(e.target).closest('li').attr('sys_data');

        self.callerObj['delete' + targetId](sys_data);
    });

    $(document).on('click', function (e) {
        self.hideSearchAreaHandler(e, self);
    });
};

SearchArea.prototype.searchOutputHandler = function (e) {
    var targetObj = $(e.target).closest('[search_id]');
    var targetId = targetObj.attr('search_id');

    if ($(e.target).prop('tagName') === 'A') {
        var id = $(e.target).attr('sys_data');
        var name = $(e.target).text();
        var user_id = $(e.target).data('user_id');
        var user_name = $(e.target).data('user_name');
    } else {
        var id = $(e.target).closest('a').attr('sys_data');
        var name = $(e.target).closest('a').text();
        var user_id = $(e.target).closest('a').data('user_id');
        var user_name = $(e.target).closest('a').data('user_name');
    }

    this.callerObj['update' + targetId](id, name, user_id, user_name);
};

SearchArea.prototype.hideSearchAreaHandler = function (e, obj) {
    var visible = $(obj.instance).find('.searchArea:visible');
    if (visible[0]) {
        var targetObj = $(visible).closest('[search_id]');
        var targetId = targetObj.attr('search_id');
        var noHide = targetObj.attr('no_hide');
        var hide = false;

        if (noHide) {
            if (!(visible[0] === $(e.target).closest('.searchArea')[0])) {
                hide = true;
            }
        } else {
            if (!(visible[0] === $(e.target).closest('.searchArea')[0]) &&
                !(targetObj.find('.inputSearchArea')[0] === $(e.target).closest('.inputSearchArea')[0])
            ) {
                hide = true;
            }
        }
        if (hide) {
            obj.hideSearchArea(Utils.lcfirst(targetId), noHide);
        }

    }
};

SearchArea.prototype.insertSearchOutput = function (data, search_id, imageFlg, isClan) {
    var self = this;
    var htmlObj = $(this.instance);
    var ul = htmlObj.find('.' + search_id + ' .searchOutput');

    if (imageFlg) {
        $.each(data, function (i, arr) {
            if (isClan) {
                var src = '/Clans/getProfileImage?clan=' + arr.id;
            } else {
                var src = '/Users/getProfileImage?user=' + arr.id;
            }
            var img = $('<img>', {
                src: src
            });
            var spanUserNm = $('<span></span>', {
                text: arr.name,
                'class': 'userNm'
            });
            var li = self.createUserLi(arr.id, img, spanUserNm, true, null, arr.user_id, arr.user_name);
            ul.append(li);
        });
    } else {
        $.each(data, function (i, arr) {
            var li = $('<li></li>');
            var a = $('<a></a>', {
                href: 'javascript:void(0)',
                text: arr.name,
                sys_data: arr.id
            });
            
            li.append(a);
            ul.append(li);
        });
    }
    ul.show();
};

SearchArea.prototype.insertResultArea = function (search_id, text, sys_data, imageFlg, isClan, noDelete) {
    var targetObj = $(this.instance).find('[search_id="' + search_id + '"]');
    var resultList = targetObj.find('.searchAreaResult ul');
    if (imageFlg) {
        if (isClan) {
            var src = '/Clans/getProfileImage?clan=' + sys_data;
        } else {
            var src = '/Users/getProfileImage?user=' + sys_data;
        }
        var img = $('<img>', {
            src: src
        });
        var spanUserNm = $('<span></span>', {
            text: text,
            'class': 'userNm'
        });

        var li = this.createUserLi(sys_data, img, spanUserNm, null, noDelete);
    } else {
        var li = $('<li></li>', {
            sys_data: sys_data
        });
        var span = $('<span></span>', {
            text: text
        });
        var a = $('<a></a>', {
            text: '×',
            'class': 'searchAreaDelete'
        });

        li.append(span);
        li.append(a);
    }

    resultList.append(li);
};

SearchArea.prototype.createUserLi = function (userId, innerLeft, innerRight, output, noDelete, user_id, user_name) {
    if (output) {
        var li = $('<li></li>', {
            'class': 'outputLi'
        });
        var a = $('<a></a>', {
            href: 'javascript:void(0)',
            sys_data: userId
        });
        a.data({
            user_id: user_id,
            user_name: user_name
        });
    } else {
        var li = $('<li></li>', {
            sys_data: userId
        });
        if (noDelete) {
            var a = null;
        } else {
            var a = $('<a></a>', {
                text: '×',
                'class': 'searchAreaDelete'
            });
        }
    }

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

    if (output) {
        a.append(wrapper);
        li.append(a);
    } else {
        wrapper.append(a);
        li.append(wrapper);
    }

    return li;
}

SearchArea.prototype.deleteResultOne = function (search_id, sys_data) {
    var targetObj = $(this.instance).find('[search_id="' + search_id + '"]');
    targetObj.find('.searchAreaResult ul li[sys_data="' + sys_data + '"]').remove();
};

SearchArea.prototype.hideSearchArea = function (targetClass, noHide) {
    this.clearSearchArea();
    if (noHide) {
        $(this.instance + ' .searchOutput').hide();
    } else {
        $(this.instance + ' .searchOutput').hide();
        $(this.instance + ' .searchArea').hide();
    }
    $(this.instance + ' .' + targetClass + ' .inputSearchArea').show();
};

SearchArea.prototype.clearSearchArea = function () {
    $(this.instance + ' .searchInput').val('');
    $(this.instance + ' .searchOutput').empty();
};

SearchArea.prototype.clearOutputArea = function () {
    $(this.instance + ' .searchOutput').empty();
    $(this.instance + ' .searchOutput').hide();
};