# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.


{
    'name': 'HiFACE Attendances',
    'version': '0.0',
    'category': 'Human Resources/Attendances',
    'sequence': 81,
    'summary': 'eKYC HiFACE Attendances',
    'description': """
This module aims to manage employee's attendances.
==================================================

This module is integrated with API HiFACE by Tinh Vân Technology Company.
       """,
    'author': 'Tinh Vân Technology Company',
    'website': 'http://www.hiface.vn',
    'license': 'LGPL-3',
    'support': 'ngoquyen45@gmail.com',
    'depends': ['hr', 'barcodes'],
    'data': [
        'security/hr_attendance_security.xml',
        'security/ir.model.access.csv',
        'views/web_asset_backend_template.xml',
        'views/hr_attendance_view.xml',
        'views/hr_department_view.xml',
        'views/hr_employee_view.xml',
        'views/res_config_settings_views.xml',
    ],
    'demo': [
        'data/hr_attendance_demo.xml'
    ],
    'installable': True,
    'auto_install': False,
    'qweb': [
        "static/src/xml/attendance.xml",
    ],
    'application': True,
}
