/*
 * Copyright (c) 2014 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */
Ext4.define('LABKEY.hplc.Stats', {

    singleton: true,

    getAUC : function(data, ybase) {
        //
        // Calculate AUC
        //
        var sum = 0.0, area = 0.0, peakMax = 0.0;
        var x1, x0, y1, y0, i;

        for (i = 1; i < data.length; i++)
        {
            x0 = data[i - 1][0] * 60;
            x1 = data[i][0] * 60;
            y0 = data[i - 1][1] - ybase;
            y1 = data[i][1] - ybase;

            // only work above the baseline
            if (y0 >= 0 && y1 >= 0)
            {
                peakMax = Math.max(y0, peakMax);
                area = ((y1 + y0) / 2) * (x1 - x0);
                sum += area;
            }
        }

        return {
            'auc': sum,
            'peakMax': peakMax
        };
    },

    /**
     * This method utilizes the regression methods provided by
     * http://tom-alexander.github.com/regression-js/
     * This library is loaded on the page and provided under window.regression
     * @param points
     * @returns {*}
     */
    getPolynomialRegression : function(points) {

        if (!Ext4.isFunction(window.regression)) {
            console.error(this.$className + '.getPolynomialRegression depends on regression.js. Include that library.');
            return;
        }

        var doRegression = function(x, terms) {
            var a = 0, exp = 0, term;
            for (var i = 0; i < terms.length;i++) {
                term = terms[i];
                a += term * Math.pow(x, exp);
                exp++;
            }
            return a;
        };

        var rSquared = function(data, terms) {

            var xs = [], _x;
            var ys = [], ystar = [], ysum = 0, _y, _yy;

            var sqrdErrorWithLine = [], SESum = 0;

            // apply equation to calculate ystar
            var getY = function(x) { return (terms[2] * Math.pow(x, 2)) + (terms[1] * x) + terms[0]; };

            for (var d=0; d < data.length; d++) {

                _x = data[d][0];
                _y = data[d][1];
                _yy = getY(_x);

                xs.push(_x);
                ys.push(_y);
                ystar.push(_yy);
                ysum += _y;

                _y = Math.pow((_y - _yy), 2);
                sqrdErrorWithLine.push(_y);
                SESum += _y;
            }

            var yavg = (ysum / ys.length), sqrdMeanY = [], meanYSum = 0;

            for (d=0; d < data.length; d++) {
                _y = ys[d] - yavg;
                _y = Math.pow(_y, 2);
                sqrdMeanY.push(_y);
                meanYSum += _y;
            }

            return 1 - (SESum / meanYSum);
        };

        var stdError = function(data, terms) {
            var  r = 0;
            var  n = data.length;
            if (n > 2) {
                var a = 0, xy;
                for (var i = 0;i < data.length;i++) {
                    xy = data[i];
                    a += Math.pow((doRegression(xy[0], terms) - xy[1]), 2);
                }
                r = Math.sqrt(a / (n - 2));
            }
            return r;
        };

        var R = regression('polynomial', points, 2);
        R.stdError = stdError(Ext4.clone(points), Ext4.clone(R.equation));
        R.rSquared = rSquared(Ext4.clone(points), Ext4.clone(R.equation));
        return R;
    },

    average : function(a) {
        var r = {mean: 0, variance: 0, deviation: 0}, t = a.length;
        for(var m, s = 0, l = t; l--; s += a[l]);
        for(m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2));
        return r.deviation = Math.sqrt(r.variance = s / t), r;
    },

    /**
     * Quadratic formula returning an array result of two numeric values [x+, x-]
     */
    getQuadratic : function(a, b, c) {
        var inner = Math.pow(b, 2) - (4 * a * c);
        var sqrtInner = Math.sqrt(inner);
        var negB = -1 * b;
        var bottom = 2 * a;

        var x_plus = (negB + sqrtInner) / bottom;
        var x_minus = (negB - sqrtInner) / bottom;

        return [x_plus, x_minus];
    }
});