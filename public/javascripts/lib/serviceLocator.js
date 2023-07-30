function ServiceLocator() {
    this.dependencies = {};
    this.factories = {};
};

ServiceLocator.prototype.factory = function (name, factory) {
    this.factories[name] = factory;
};

ServiceLocator.prototype.register = function (name, instance) {
    this.dependencies[name] = instance;
};

ServiceLocator.prototype.get = function (name) {
    if (!this.dependencies[name]) {
        var factory = this.factories[name];
        this.dependencies[name] = factory && new factory(this);
        // if (!this.dependencies[name]) {
        //     throw new Error('Cannot find module: ' + name);
        // }
    }
    return this.dependencies[name];
};
