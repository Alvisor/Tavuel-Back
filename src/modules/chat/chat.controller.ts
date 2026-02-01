import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(@Body('participants') participants: string[]) {
    return this.chatService.createConversation(participants);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async findConversations(@CurrentUser('id') userId: string) {
    return this.chatService.findConversations(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation found' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findConversation(@Param('id', ParseUuidPipe) id: string) {
    return this.chatService.findConversation(id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') senderId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.sendMessage(id, senderId, content);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('id', ParseUuidPipe) id: string,
    @Query() query: any,
  ) {
    return this.chatService.getMessages(id, query);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.markAsRead(id, userId);
  }
}
