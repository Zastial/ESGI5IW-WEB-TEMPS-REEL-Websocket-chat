import { Controller, Get, Res } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  redirect(@Res() res) {
    return res.redirect('/front/index.html');
  }
}
