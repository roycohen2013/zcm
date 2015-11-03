#! /usr/bin/env python
# encoding: utf-8

import sys,optparse
import waflib
from waflib import Logs
from waflib.Errors import WafError

# these variables are mandatory ('/' are converted automatically)
top = '.'
out = 'build'

# Allow import of custom tools
sys.path.append('examples/waftools')

def options(ctx):
    ctx.load('compiler_c')
    ctx.load('compiler_cxx')
    add_zcm_options(ctx)

def add_zcm_options(ctx):
    gr = ctx.add_option_group('ZCM Configuration options')
    gr.add_option('-s', '--symbols', dest='symbols', default=False, action='store_true',
                   help='Leave the debugging symbols in the resulting object files')
    gr.add_option('-d', '--debug', dest='debug', default=False, action='store_true',
                   help='Compile all C/C++ code in debug mode: no optimizations and full symbols')

    def add_disable_option(name, desc):
        gr.add_option('--disable-'+name, dest='disable_'+name, default=False, action='store_true', help=desc)

    def add_trans_option(name, desc):
        gr.add_option('--disable-'+name, dest='disable_'+name, default=False, action='store_true', help=desc)

    add_disable_option('java', 'Disable java features')
    add_disable_option('zmq',  'Disable ZeroMQ features')

    add_trans_option('inproc', 'Disable the In-Process transport (Requires ZeroMQ)')
    add_trans_option('ipc',    'Disable the IPC transport (Requires ZeroMQ)')
    add_trans_option('udpm',   'Disable the UDP Multicast transport (LCM-compatible)')
    add_trans_option('serial', 'Disable the Serial transport')

def configure(ctx):
    ctx.load('compiler_c')
    ctx.load('compiler_cxx')
    ctx.recurse('gen')
    ctx.recurse('config')
    ctx.load('zcm-gen')
    process_zcm_options(ctx)

def process_zcm_options(ctx):
    opt = waflib.Options.options
    env = ctx.env;
    def hasopt(key):
        return getattr(opt, key)

    ctx.env.VERSION='1.0.0'
    ctx.USING_OPT = not opt.debug
    ctx.USING_SYM = opt.debug or opt.symbols

    env.DISABLE_CPP  = False
    env.DISABLE_JAVA = hasopt('disable_java')
    if not env.DISABLE_JAVA:
        attempt_use_java(ctx);
    env.DISABLE_ZMQ  = hasopt('disable_zmq')
    if not env.DISABLE_ZMQ:
        attempt_use_zmq(ctx);

    env.DISABLE_TRANS_IPC    = hasopt('disable_ipc')
    env.DISABLE_TRANS_INPROC = hasopt('disable_inproc')
    env.DISABLE_TRANS_UDPM   = hasopt('disable_udpm')
    env.DISABLE_TRANS_SERIAL = hasopt('disable_serial')

    ZMQ_REQUIRED = not env.DISABLE_TRANS_IPC or not env.DISABLE_TRANS_INPROC
    if ZMQ_REQUIRED and env.DISABLE_ZMQ:
        raise WafError("Using ZeroMQ is required for some of the selected transports (turn off --disable-zmq)")

    def print_entry(name, enabled):
        Logs.pprint("NORMAL", "    {:15}".format(name), sep='')
        if enabled:
            Logs.pprint("GREEN", "Enabled")
        else:
            Logs.pprint("RED", "Disabled")

    Logs.pprint('BLUE', '\nDependency Configuration:')
    print_entry("C/C++",  not env.DISABLE_CPP)
    print_entry("Java",   not env.DISABLE_JAVA)
    print_entry("ZeroMQ", not env.DISABLE_ZMQ)

    Logs.pprint('BLUE', '\nTransport Configuration:')
    print_entry("ipc",    not env.DISABLE_TRANS_IPC)
    print_entry("inproc", not env.DISABLE_TRANS_INPROC)
    print_entry("udpm",   not env.DISABLE_TRANS_UDPM)
    print_entry("serial", not env.DISABLE_TRANS_SERIAL)

    Logs.pprint('NORMAL', '')

def attempt_use_java(ctx):
    ctx.load('java')
    ctx.check_jni_headers()
    return True

def attempt_use_zmq(ctx):
    ctx.check_cfg(package='libzmq', args='--cflags --libs', uselib_store='zmq')
    return True

def setup_environment(ctx):
    ctx.post_mode = waflib.Build.POST_LAZY

    WARNING_FLAGS = ['-Wall', '-Werror', '-Wno-unused-function', '-Wno-format-zero-length']
    SYM_FLAGS = ['-g']
    OPT_FLAGS = ['-O3']
    ctx.env.CFLAGS_default   = ['-std=gnu99', '-fPIC', '-pthread'] + WARNING_FLAGS
    ctx.env.CXXFLAGS_default = ['-std=c++11', '-fPIC', '-pthread'] + WARNING_FLAGS
    ctx.env.INCLUDES_default = [ctx.path.abspath()]
    ctx.env.LINKFLAGS_default = ['-pthread']

    ctx.env.DEFINES_default = []
    for k in ctx.env.keys():
        if k.startswith('DISABLE_') or k.startswith('USING_'):
            if getattr(ctx.env, k):
                ctx.env.DEFINES_default.append(k)

    if ctx.env.USING_OPT:
        ctx.env.CFLAGS_default   += OPT_FLAGS
        ctx.env.CXXFLAGS_default += OPT_FLAGS
    if ctx.env.USING_SYM:
        ctx.env.CFLAGS_default   += SYM_FLAGS
        ctx.env.CXXFLAGS_default += SYM_FLAGS

    ctx.env.ENVIRONMENT_SETUP = True

def build(ctx):
    if not ctx.env.ENVIRONMENT_SETUP:
        setup_environment(ctx)

    ctx.recurse('zcm')
    ctx.recurse('config')
    ctx.recurse('gen')
    ctx.recurse('tools')

    ctx.add_group()

    ctx.recurse('test')
